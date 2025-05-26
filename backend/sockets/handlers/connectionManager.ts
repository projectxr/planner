import { Socket } from 'socket.io';

export default class ConnectionManager {
	async pinging(connData: any, socket: Socket) {
		const { calendarId } = connData;
		socket.emit('pingu', { calendarId });
		socket.in(calendarId).emit('pingu', { calendarId });
	}

	async joinRoom(calendarData: any, socket: Socket) {
		const { uidList } = calendarData;
		await socket.join(uidList);
		uidList.forEach((uid: string[]) =>
			socket.in(uid).emit('partnerJoined', uid)
		);
	}
}
