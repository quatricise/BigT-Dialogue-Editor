class Server {
  static baseUrl = "http://127.0.0.1"
  static port = 3000
  static async getDialogueData(folderName) {
    let 
    form = new FormData()
    form.append("folder", folderName)
    const response = await fetch(`${this.baseUrl}:${this.port}/get-dialogue-data`, {
      method: "POST",
      mode: "cors",
      contentType: "multipart/form-data",
      body: form
    })
    const data = await response.json()
    return data
  }
  static async saveFile(folder, filename, data = {}) {
    if(!folder || !filename || !data) return false

    let 
    form = new FormData()
    form.append("folder", folder)
    form.append("filename", filename)
    form.append("data", JSON.stringify(data))
    const response = await fetch(`${this.baseUrl}:${this.port}/save-file`, {
      method: "POST",
      mode: "cors",
      contentType: "multipart/form-data",
      body: form
    })
    return response.status
  }
  static async deleteFile(folder, filename) {
    let 
    form = new FormData()
    form.append("folder", folder)
    form.append("filename", filename)
    const response = await fetch(`${this.baseUrl}:${this.port}/delete-file`, {
      method: "POST",
      mode: "cors",
      contentType: "multipart/form-data",
      body: form
    })
    return response.status
  }
  static async renameFile(folder, filename, newName) {
    let 
    form = new FormData()
    form.append("folder", folder)
    form.append("filename", filename)
    form.append("newName", newName)
    const response = await fetch(`${this.baseUrl}:${this.port}/rename-file`, {
      method: "POST",
      mode: "cors",
      contentType: "multipart/form-data",
      body: form
    })
    return response.status
  }
}