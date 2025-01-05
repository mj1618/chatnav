export function concatArrays(arrays: Float32Array[]) {
  if (arrays.length === 0) {
    return new Float32Array(0);
  }
  const sizes = arrays.reduce(
    (out, next) => {
      out.push(out.at(-1)! + next.length);
      return out;
    },
    [0]
  );
  const outArray = new Float32Array(sizes.at(-1)!);
  arrays.forEach((arr, index) => {
    const place = sizes[index];
    outArray.set(arr, place);
  });
  return outArray;
}
