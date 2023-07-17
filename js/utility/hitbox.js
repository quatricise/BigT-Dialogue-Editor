class BoundingBox {
  constructor(x, y, w, h) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.type = "box"
    this.positionOffset = new Vector()
  }
  expand(amount) {
    this.w += amount * 2
    this.h += amount * 2
    this.x -= amount
    this.y -= amount
    return this
  }
  get position() {
    return new Vector(this.x - this.w/2, this.y - this.h/2)
  }
}
