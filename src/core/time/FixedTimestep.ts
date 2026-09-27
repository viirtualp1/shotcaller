export class FixedTimestep {
  private accumulator = 0

  constructor(
    readonly step: number,
    private readonly maxFrame = 0.1,
  ) {}

  advance(realSeconds: number, timeScale: number, tick: (dt: number) => boolean) {
    this.accumulator += Math.min(realSeconds, this.maxFrame) * timeScale

    while (this.accumulator >= this.step) {
      this.accumulator -= this.step

      if (!tick(this.step)) {
        this.accumulator = 0

        return
      }
    }
  }
}
