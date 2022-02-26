const mongoose = require("mongoose");

const meetSchema = new mongoose.Schema({
    meet_code: { type: String, unique: true },
    host_email: String,
    host_fname: String,
    host_lname: String,
    authorized_emails : [String]
})

module.exports = mongoose.model("Meet", meetSchema);