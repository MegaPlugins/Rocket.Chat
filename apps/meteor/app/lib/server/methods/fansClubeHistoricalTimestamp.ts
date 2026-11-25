import { Rooms, Users } from '@rocket.chat/models';
import { Meteor } from 'meteor/meteor';

import { hasPermissionAsync } from '../../../authorization/server/functions/hasPermission';

/** Only integration-created, read-only public rooms and their technical publishers. */
export async function authorizeFansClubeHistoricalTimestamp(userId: string, rid: string, value: unknown): Promise<Date> {
	const serviceId = process.env.FANSCLUBE_HISTORICAL_SERVICE_USER_ID;
	if (!serviceId || typeof rid !== 'string' || !rid || typeof value !== 'string' ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
		throw new Meteor.Error('error-not-allowed', 'Historical import is not configured or timestamp is invalid');
	}
	const date = new Date(value);
	if (!Number.isFinite(date.getTime()) || date.toISOString() !== value || date.getTime() > Date.now()) {
		throw new Meteor.Error('error-invalid-params', 'Invalid historical timestamp');
	}
	const [user, room] = await Promise.all([Users.findOneById(userId), Rooms.findOneById(rid)]);
	const community = /^fansclube_([1-9][0-9]*)$/.exec(user?.username || '');
	if (!community || !user?.active || userId === serviceId || !room || room.t !== 'c' || !room.ro ||
		room.u?._id !== serviceId || !room.name?.endsWith(`-${community[1]}`) ||
		!(await hasPermissionAsync(userId, 'edit-room', rid))) {
		throw new Meteor.Error('error-not-allowed', 'Historical import is not allowed in this room');
	}
	return date;
}
