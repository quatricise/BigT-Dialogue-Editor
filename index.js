const fs = require("fs")
const cors = require("cors")
const express = require('express')
const {formidable} = require("formidable")
const app = express()
const port = 3000

app.use(cors({origin: "*"}))

app.post('/get-dialogue-data', async (request, response) => {
  let [fields, files] = await parseForm(request)
  let folder = fields.folder
  console.log(folder)
  let characters, fileList = []
  if(fs.existsSync("dialogue/" + folder) === false) {
    createDialogueDir(folder)
  }
  else { 
    characters = fs.readdirSync("assets/portraits")
    fileList = fs.readdirSync(`dialogue/${folder}`)
    fileList = fileList.filter(f => {
      let lastDot = f.lastIndexOf(".")
      let extension = f.slice(lastDot + 1)
      if(extension === "json")
        return true
      else
        return false
    })
  }
  response.json({files: fileList, characters: characters})
})

function createDialogueDir(name) {
  fs.mkdirSync("dialogue/" + name)
  fs.mkdirSync("dialogue/" + name + "/_deleted")
}

app.post('/save-file', async (request, response) => {
  let [fields, files] = await parseForm(request)
  let folder = fields.folder
  let filename = fields.filename
  let data = JSON.stringify(JSON.parse(fields.data))
  fs.writeFile(`dialogue/${folder}/${filename}.json`, data, () => {
    response.writeHead(200, "OK").end()
  })
})

app.post('/delete-file', async (request, response) => {
  let [fields, files] = await parseForm(request)
  let folder = fields.folder
  let filename = fields.filename
  let path = `dialogue/${folder}/${filename}.json`
  console.log(path)
  if(fs.existsSync(path)) {
    fs.renameSync(path, `dialogue/${folder}/_deleted/${filename}.json`)
    response.writeHead(200, "Deleted file")
    response.end()
  }
  else {
    response.writeHead(500, "File does not exist, make sure to open a folder first.")
    response.end()
  }
})

app.post('/rename-file', async (request, response) => {
  let [fields, files] = await parseForm(request)
  let folder = fields.folder
  let filename = fields.filename
  let newName = fields.newName
  let path = `dialogue/${folder}/${filename}.json`
  if(fs.existsSync(path) && newName) {
    fs.renameSync(path, `dialogue/${folder}/${newName}.json`)
    response.writeHead(200, "Renamed file").end()
  }
  else {
    response.writeHead(500, "Rename failed.").end()
  }
})

app.listen(port, () => console.log(`Listening on port ${port}.`))


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
