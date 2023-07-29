class DialogueNodeStack {
  constructor(
    /** @type Array<DialogueNode> */ nodes = [], 
    /** @type String */ type
  ) {
    this.nodes = new Set()
    this.anchorNode = /** @type DialogueNode */ null
    this.addNodes(...nodes)
    
    this.type = type ?? this.calculateType()
  }
  addNodes(...nodes) {
    nodes.forEach(n => {
      this.nodes.add(n)
      n.stacks.add(this)
    })
  }
  deleteNodes(...nodes) {
    nodes.forEach(n => {
      this.nodes.delete(n)
      n.stacks.delete(this)
    })
    if(this.nodes.size <= 1) 
      dialogueEditor.deleteStack(this)
  }
  setAnchorNode(node) {
    this.anchorNode = node
  }
  calculateType() {
    let nodes = []
    this.nodes.forEach(n => nodes.push(n))
    let bounds = dialogueEditor.getStackBounds(nodes)
    let isHorizontal = dialogueEditor.isStackHorizontal(bounds)
    return isHorizontal ? "horizontal" : "vertical"
  }
  destroy() {
    this.nodes.forEach(node => {
      node.stacks.delete(this)
    })
  }
  get size() {
    return this.nodes.size
  }
  static types = ["horizontal", "vertical"]
}