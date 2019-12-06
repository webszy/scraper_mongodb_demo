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
 
const dataModel = new Schema({
  url: { type: String },
  name: { type: String }
})
module.exports={dataModel}