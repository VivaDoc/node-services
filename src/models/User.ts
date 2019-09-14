import mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const findOrCreate = require('mongoose-find-or-create');


export interface User {
  githubId: string;
  username: string;
  displayName: string;
  profileUrl: string;
  accessToken: string;
}


const UserSchema = new mongoose.Schema({
  githubId: {type: String, unique: true, required: [true, "can't be blank"], index: true},
  username: {type: String, unique: false, required: [true, "can't be blank"] },
  displayName: {type: String, unique: false },
  profileUrl: {type: String, unique: false, required: [true, "can't be blank"] },
  accessToken: {type: String, unique: false, required: [true, "can't be blank"]}
}, {timestamps: true});


UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});
UserSchema.plugin(findOrCreate);


mongoose.model('User', UserSchema);
