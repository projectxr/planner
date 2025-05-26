import { verify } from 'jsonwebtoken';
import config from 'config';
import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { ExtendedError } from 'socket.io/dist/namespace';

let jwtAuth = async (
	socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap>,
	next: (err?: ExtendedError | undefined) => void
) => {
	if (!socket.handshake.query.token) return next(new Error('No Token'));
	const token: string = socket.handshake.query.token.toString();
	if (socket.handshake.query && socket.handshake.query.token) {
		verify(token, config.get('jwtSecret'), function (err, decoded) {
			if (err) return next(new Error('Authentication error'));
			next();
		});
	} else {
		next(new Error('Authentication error'));
	}
};

export default jwtAuth;
