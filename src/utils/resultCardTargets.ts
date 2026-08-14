export function renderAllResultCards<T>(
  canvases: Array<T | null>,
  render: (canvas: T) => void,
): void {
  const rendered = new Set<T>();

  for (const canvas of canvases) {
    if (canvas === null || rendered.has(canvas)) continue;
    rendered.add(canvas);
    render(canvas);
  }
}
