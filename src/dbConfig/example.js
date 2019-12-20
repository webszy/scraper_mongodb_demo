const mongoose = require('mongoose')

const uri = 'mongodb://localhost:27017/scrape?retryWrites=true&w=majority'
const config = { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false }
mongoose.connect(uri, config)
  .then(
    () => {
      console.log('connect mongodb:scrape success')
    },
    err => {
      console.log('TCL: err', err)
      process.exit(0)
    }
  )

const Schema = mongoose.Schema
 
const starSchema  = new Schema({
  name: { type: String },
  englishName: { type: String },
  nickName: { type: String },
  face_url: { type: String },
  face_url_group: { type: Array, default: [] }, // Array of every face_url,just like {url:''}
  birth_place: { type: String },
  birthday: { type: String },
  occupation: { type: String },
  content: { type: Object },
  sign: { type: String },
  country: { type: String },
  sex: { type: String },
  weight: { type: String, default: '' },
  height: { type: String, default: '' },
  company: { type: String, default: '' },
  url: { type: String },
  file_name: { type: String, default: '' },
  is_download: { type: Boolean, default: false },
  is_submit: { type: Boolean, default: false }
})
const tagSchema = new Schema({
  word: { type: String, required: true },
  wordEN: { type: String, required: true },
  lang: { type: String, required: true },
  list: { type: Object, required: true },
  isDone: { type: Boolean }
})
module.exports={
  dataModel:mongoose.model('datas', starSchema),
  tagModel:mongoose.model('tags', tagSchema)
}