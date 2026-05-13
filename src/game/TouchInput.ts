export interface TouchState {
  active: boolean;
  x: number;
  y: number;
  startX: number;
  startY: number;
}

export class TouchInput {
  private state: TouchState = {
    active: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
  };

  init(): void {
    wx.onTouchStart((e) => {
      const touch = e.touches[0];
      if (!touch) return;
      this.state.active = true;
      this.state.startX = touch.clientX;
      this.state.startY = touch.clientY;
      this.state.x = touch.clientX;
      this.state.y = touch.clientY;
    });

    wx.onTouchMove((e) => {
      const touch = e.touches[0];
      if (!touch || !this.state.active) return;
      this.state.x = touch.clientX;
      this.state.y = touch.clientY;
    });

    wx.onTouchEnd(() => {
      this.state.active = false;
    });
  }

  getState(): Readonly<TouchState> {
    return this.state;
  }

  /** Drag offset from touch start, scaled by factor. */
  getDragOffset(factor: number): { dx: number; dy: number } {
    if (!this.state.active) return { dx: 0, dy: 0 };
    return {
      dx: (this.state.x - this.state.startX) * factor,
      dy: (this.state.y - this.state.startY) * factor,
    };
  }
}
