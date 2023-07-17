const fs = require("fs")
const cors = require("cors")
const express = require('express')
const app = express()
const port = 3000
const {formidable} = require("formidable")

app.use(cors({origin: "*"}))
app.post('/get-dialogue-data', async (request, response) => {
  let [fields, files] = await parseForm(request)
  let folder = fields.folder
  let characters = fs.readdirSync("assets/portraits")
  let fileList = fs.readdirSync(`dialogue/${folder}`)
  response.json({files: fileList, characters: characters})
})
app.post('/save-file', async (request, response) => {
  let [fields, files] = await parseForm(request)
  let folder = fields.folder
  let filename = fields.filename
  let data = JSON.stringify(fields.data)
  fs.writeFile(`dialogue/${folder}/${filename}.json`, data, () => {
    console.log(filename, folder, data)
  })
  response.writeHead(200, "OK")
})
app.listen(port, () => console.log(`Example app listening on port ${port}!`))


async function parseForm(request) {
  let form = formidable({})
  let formData = await new Promise((resolve, reject) => {
    form.parse(request, function (error, fields, files) {
      if(error) {
        reject(error)
        return
      }
      resolve({fields: fields, files: files})
    })
  })
  return [formData.fields, formData.files]
}
