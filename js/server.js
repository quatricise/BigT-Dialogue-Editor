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
  static async saveFile(folderName, fileName, data = {}) {
    if(!folderName || !data || !fileName) return false
    let 
    form = new FormData()
    form.append("folder", folderName)
    form.append("filename", fileName)
    form.append("data", data)
    const response = await fetch(`${this.baseUrl}:${this.port}/save-file`, {
      method: "POST",
      mode: "cors",
      contentType: "multipart/form-data",
      body: form
    })
    return response.status
  }
}