class Camera {
  constructor(x, y, minX, minY, maxX, maxY, width, viewportWidth, viewportHeight) {
    // each of these is measured relative to the world coordinate system
    this.x = x;
    this.y = y;
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    this.width = width;
    this.height = width * viewportHeight / viewportWidth;
    this.scale = width / viewportWidth;
    // while all of the above are in the world coordinate system, the below are in the page coordinate system
    this.viewportWidth = viewportWidth; // width / height
    this.viewportHeight = viewportHeight;
    this.isMoving = false;
    this.moveLastX = null;
    this.moveLastY = null;
  }

  canvasToWorldCoords(x, y) {
    const worldX = (x - this.viewportWidth / 2) * (this.width / this.viewportWidth) + this.x;
    const worldY = -1 * (y - this.viewportHeight / 2) * (this.width / this.viewportWidth) + this.y;
    return {x: worldX, y: worldY};
  }

  worldToCanvasCoords(x, y) {
    const canvasX = (x - this.x) * (this.viewportWidth / this.width) + this.viewportWidth / 2;
    const canvasY = -1 * (y - this.y) * (this.viewportWidth / this.width) + this.viewportHeight / 2;
    return {x: canvasX, y: canvasY};
  }

  onMouseDown(x, y) { // canvas coords
    if (x && y) {
      this.moveLastX = x;
      this.moveLastY = y;
      this.isMoving = true;
    }
  }

  onMouseMove(x, y) { // canvas coords
    if (this.isMoving && x && y) {
      this.setNewMousePosition(x, y);
      this.moveLastX = x;
      this.moveLastY = y;
    }
  }

  onMouseUp(x, y) { // canvas coords
    if (this.isMoving && x && y) {
      this.setNewMousePosition(x, y);
      this.moveLastX = null;
      this.moveLastY = null;
      this.isMoving = false;
    }
  }

  setWidth(width) { // world scale width
    this.width = width;
    this.height = width * this.viewportHeight / this.viewportWidth;
    this.scale = width / this.viewportWidth;
  }

  onWheel(deltaY) {
    let newWidth = this.width * (1.01 ** deltaY);
    //clip
    newWidth = Math.max(6, newWidth);
    newWidth = Math.min(newWidth, 2 * (this.x - this.minX), 2 * (this.y - this.minY), 2 * (this.maxX - this.x), 2 * (this.maxY - this.y))
    this.setWidth(newWidth);
  }

  setNewMousePosition(mouseNewX, mouseNewY) { // canvas coords
    const dx = mouseNewX - this.moveLastX;
    const dy = mouseNewY - this.moveLastY;
    this.x -= dx * this.scale;
    this.y -= -1 * dy * this.scale;
    // clip
    this.x = Math.max(this.minX + this.width/2, Math.min(this.maxX - this.width/2, this.x));
    this.y = Math.max(this.minY + this.height/2, Math.min(this.maxY - this.height/2, this.y));
  }
}

export default Camera;
