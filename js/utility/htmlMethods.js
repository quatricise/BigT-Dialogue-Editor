function Q(query) {
  return document.querySelector(query)
}
function Qa(query) {
  return Array.from(document.querySelectorAll(query))
}
function El(
  elementTagName = "div", 
  cssClass = "words separated by spaces", 
  attributes = [] /* = [["key", "value"]] */,
  innerText = "",
  dataset = [],
) {
  let element = document.createElement(elementTagName)
  let cssClasses = cssClass.split(' ')
  attributes.forEach(attr=> {
    element.setAttribute(attr[0], attr[1])
  })
  cssClasses.forEach(cls => {
    element.classList.add(cls)
  })
  dataset.forEach(attribute => {
    element.dataset[attribute[0]] = attribute[1] 
  })
  element.innerText = innerText
  return element
}

El.special = (name, args = {}) => {
  if(name === "node-socket-out") {
    return El('div', "dialogue-node-socket out", [["title", "Drag to connect to other nodes"]])
  } 
  if(name === "node-socket-in") {
    return El('div', "dialogue-node-socket in")
  } 
  if(name === "bubble-toggle") {
    let bubbleCount = args.options ? args.options.length - 1 : 1
    function createRow(text) {
      let row =     El("div", "bubble-toggle-row")
      let bubble =  El("div", "toggle-bubble")
      let textElement =    El("div", "bubble-toggle-text", undefined, text)
      row.append(bubble, textElement)
      return row
    }
    function createConnector() {
      return El("div", "toggle-bubble-connector " + args.orientation)
    }
    let toggleContainer = El("div", "bubble-toggle-container " + args.orientation)

    toggleContainer.append(createRow(args.options[0]))
    for(let i = 0; i < bubbleCount; i++) {
      toggleContainer.append(createConnector(), createRow(args.options[i + 1]))
    }

    return toggleContainer
  }
}

El.hasAllClasses = (element, classes = []) => {
  let predicate = true
  classes.forEach(cls => {
    if(element.classList.contains(cls) === false) predicate = false 
  })
  return predicate
}

function SVGEl(
  elementTagName = "svg", 
  cssClass = "words separated by spaces", 
  attributes = [], /* = [["key", "value"]] */
  innerText = "",
) {
  let element = document.createElementNS("http://www.w3.org/2000/svg", elementTagName)
  let cssClasses = cssClass.split(' ')
  attributes.forEach(attr=> {
    element.setAttribute(attr[0], attr[1])
  })
  cssClasses.forEach(cls => {
    element.classList.add(cls)
  })
  element.innerText = innerText
  return element
}

function getChildIndex(HTMLNode) {
  return Array.prototype.indexOf.call(HTMLNode.parentNode.childNodes, HTMLNode)
}
