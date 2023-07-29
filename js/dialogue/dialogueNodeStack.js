class DialogueNodeStack {
  constructor(
    /** @type Array<DialogueNode> */ nodes = [], 
    /** @type String */ type
  ) {
    this.nodes = new Set()
    this.anchorNode = /** @type DialogueNode */ null
    this.type = type ?? this.calculateType()

    this.addNodes(...nodes)
    this.setAnchorNode()
  }
  addNodes(...nodes) {
    nodes.forEach(n => {
      this.nodes.add(n)
      n.stacks.add(this)
    })
    this.setAnchorNode()
  }
  deleteNodes(...nodes) {
    nodes.forEach(n => {
      this.nodes.delete(n)
      n.stacks.delete(this)
    })
    this.setAnchorNode()
    if(this.nodes.size <= 1) 
      dialogueEditor.deleteStack(this)
  }
  setAnchorNode() {
    let axis = this.type === "horizontal" ? "x" : "y"

    /* sort nodes based on their position along the stack's axis */
    let nodes = Array.from(this.nodes).sort((a, b) => a.pos[axis] - b.pos[axis])
    this.anchorNode = nodes[0]
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