class BubbleToggle extends UIComponent {
  constructor(
    programWindow, 
    parentElement, 

    /* the structure of the options data is the most important, it should simplify keeping track of this component */
    values = [
      {
        title: "something",
        subvalues: [
          {
            title: "subption",
          }
        ]
      },
    ],
    options = {orientation: null}
  ) {
    super(programWindow)
    this.parentElement = parentElement

    /* configure options */
    this.options = {}
    this.options.orientation = options.orientation ?? "vertical"
    this.values = values

    /* assign a boolean to each value and subvalue to toggle whether it is selected */
    this.values.forEach(val => {
      val.selected = false
      val.subvalues?.forEach(sub => {
        sub.selected = false
      })
    })

    /* reference to the various HTML elements */
    this.elements = {
      values: [],
      subvalueLists: [],
      subvalues: [],
    }
    this.createHTML()
  }
  createHTML() {
    /* constructor functions */
    const value = (index) => {
      let data = this.values[index]

      let row =         El("div", "bubble-toggle-row")
      let bubble =      El("div", "toggle-bubble")
      let textElement = El("div", "bubble-toggle-text", undefined, data.name.splitCamelCase().capitalize())
      row.append(bubble, textElement)

      /* select the value by clicking on the row */
      row.onclick = () => {
        this.values.forEach(val => val.selected = false)
        this.values[index].selected = true
        
        this.elements.values.forEach(val => val.classList.remove("selected"))
        row.classList.add("selected")

        /* show the subvalues menu if they exist */
        this.elements.subvalueLists.forEach(list => list.classList.add("hidden"))
        if(data.subvalues) {
          this.elements.subvalueLists[index].classList.remove("hidden")
        }
      }

      this.elements.values.push(row)
      return row
    }
    const subvalue = (data) => {
      let row = El("div", "bubble-subvalue-row")
      let textElement = El("div", "bubble-toggle-text", undefined, data.name.splitCamelCase().capitalize())
      new Checkbox(this.programWindow, row, {size: 16, useParentAsHitbox: true})
      row.append(textElement)

      row.onclick = () => {
        data.selected = !data.selected
      }

      this.elements.subvalues.push(row)
      return row
    }
    const subvalueList = () => {
      let list = El("div", "subvalue-list hidden")
      this.elements.subvalueLists.push(list)
      return list
    }
    const connector = () => {
      return El("div", "toggle-bubble-connector " + this.options.orientation)
    }

    /* create the main container */
    let 
    container = El("div", "bubble-toggle-container " + this.options.orientation)

    /* append values */
    for(let i = 0; i < this.values.length; i++) {
      if(i !== 0)
        container.append(connector())
        
      let val = value(i)
      container.append(val)

      let list = subvalueList()
      container.append(list)

      if(this.values[i].subvalues) {
        for(let sub of this.values[i].subvalues) {
          list.append(subvalue(sub))
        }
      }
    }
    this.parentElement.append(container)
  }
  get currentValue() {
    return this.values.find(val => val.selected)
  }
}