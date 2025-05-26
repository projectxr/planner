const sgMail = require('@sendgrid/mail');

let sendMail = async (emailId: string, content: any) => {
	sgMail.setApiKey(process.env.SENDGRID_API_KEY);
	const msg = {
		to: emailId,
		from: 'no-reply@simplem.in',
		...content,
	};
	sgMail
		.send(msg)
		.then(
			() => {
				Function.prototype();
			},
			(error: any) => {
				console.error(error);
				if (error.response) {
					console.error(error.response);
				}
			}
		)
		.catch((err: Error) => console.log(err));
};

export default sendMail;
