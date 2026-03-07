const nodemailer = require("nodemailer");

async function sendEmail(to, subject, text){
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"OfficeOps" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text,
    };
    await transporter.sendMail(mailOptions);
}
module.exports = sendEmail;