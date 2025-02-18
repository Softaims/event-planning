const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN;    
const twilioPhoneNumber = process.env.TWILIO_PHONE; 

const client = twilio(accountSid, authToken);

exports.sendVerificationCode = async (phoneNumber, code) => {
    try {
        const message = await client.messages.create({
            body: `Your one time verification code is: ${code}. Please type this code in your app to complete the verification.`,
            from: twilioPhoneNumber,
            to: phoneNumber
        });
        console.log("SMS sent: ", message.sid);
        return message.sid;
    } catch (error) {
        console.error("Error sending SMS:", error);
        throw new Error('Failed to send verification code.');
    }
};