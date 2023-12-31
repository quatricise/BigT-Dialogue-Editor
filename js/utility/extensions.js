/* string */
String.prototype.capitalize = function() {
  return this.charAt(0).toLocaleUpperCase() + this.slice(1)
}
String.prototype.decapitalize = function() {
  return this.charAt(0).toLocaleLowerCase() + this.slice(1)
}
String.prototype.reverse = function() {
  return this.split('').reverse().join('')
}
String.prototype.bool = function() {
  if(this.includes("false")) return false
  if(this.includes("true")) return true
}
String.prototype.matchAgainst = function(...strings) {
  let match = false
  strings.forEach(str => {
    if(str == this) 
      match = true
  })
  return match
}
String.prototype.includesAny = function(...strings) {
  for(let str of strings)
    if(this.includes(str))
      return true
}
String.prototype.splitCamelCase = function() {
  return this.replace(/([a-z])([A-Z])/g, '$1 $2')
}
String.prototype.camelCaseToArray = function() {
  return this.splitCamelCase().toLocaleLowerCase()
}

/* array */
Array.prototype.remove = function(...children) {
  children.forEach(child => {
    if(this.find(c => c === child) === undefined)
      return
    this.splice(this.indexOf(child), 1)
  })
}
Array.prototype.findChild = function(child) {
  return this.find(obj => obj === child)
}
Array.prototype.has = function(item) {
  return this.find(obj => obj === item)
}
Array.prototype.after = function(item) {
  return this[this.indexOf(item) + 1] ?? null
}
Array.prototype.before = function(item) {
  return this[this.indexOf(item) - 1] ?? null
}
Array.prototype.last = function() {
  return this[this.length - 1]
}
Array.prototype.removeAt = function(index) {
  return this.splice(index, 1)
}
Array.prototype.empty = function() {
  while(this.length)
    this.pop()
}
Array.prototype.clear = function() {
  while(this.length)
    this.pop()
}

/* set */
Set.prototype.find = function(/** @type Function */ filterFunction) {
  for(let item of this) {
    if(filterFunction(item)) return item
  }
}
Set.prototype.filter = function(/** @type Function */ filterFunction) {
  let items = []
  for(let item of this) {
    if(filterFunction(item)) items.push(item)
  }
  return items
}