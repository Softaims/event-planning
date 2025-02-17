const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');
const path = require('path');

module.exports = class EmailService {
    constructor(user, verificationCode) {
        this.to = user.email;
        this.firstName = user.firstName
        this.verificationCode = verificationCode;
        this.from = `${process.env.EMAIL_FROM}`;
    }

    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            return nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
        } else {
            return nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USERNAME,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }
    }

    async send(template, subject) {

        const templatePath = path.join(__dirname, `../views/emails/${template}.pug`);
        const html = pug.renderFile(templatePath, {
            firstName: this.firstName,
            verificationCode: this.verificationCode,
            subject,
        });

        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: convert(html)
        };

        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcome() {
        await this.send('welcome', 'Welcome to Our Service!');
    }

    async sendPasswordReset() {
        await this.send('passwordReset', 'Your password reset token (valid for only 10 minutes)');
    }

    async sendVerificationEmail() {
        await this.send('emailVerification', 'Please verify your email address');
    }
};
