import { connect } from 'mongoose';
const config = require('config');
import { ErrorCode } from '../utils/consts';
const mongoURI = config.get('mongoURI');
const postgrsURI = config.get('postgresURI');
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(postgrsURI, {
	dialect: 'postgres',
	protocol: 'postgres',
	logging: false,
});

const connectDB = async () => {
	try {
		await connect(mongoURI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
			useCreateIndex: true,
		} as any);
		await sequelize.authenticate();
		console.log('DB Success');
		return sequelize;
	} catch (err) {
		console.error('DB Connect error' + err);
		process.exit(ErrorCode.DB_CONN_ERR);
	}
};

export default connectDB;
