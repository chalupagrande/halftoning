import { flatten, xor } from 'lodash';
export const pi = Math.PI
/**
 * Converts rgba to cmyk
 * @param {*} rgbaColorObject - Object with r,g,b and a values for red green blue and alpha
 * @returns object - with c,m,y,k values
 */
export function convertRGBToCMYK(rgbaColorObject) {
  const { r, g, b, a } = rgbaColorObject
  const rRatio = r / 255
  const gRatio = g / 255
  const bRatio = b / 255
  const k = 1 - Math.max(rRatio, gRatio, bRatio)
  const c = (1 - rRatio - k) / (1 - k)
  const m = (1 - gRatio - k) / (1 - k)
  const y = (1 - bRatio - k) / (1 - k)
  // const w = r * 0.21 + g * 0.72 + b * 0.07
  const w = 1 - k
  return { c, m, y, k, w }
}

/**
 * Calculates the projected size of a rotate image
 * @param {*} size
 * @param {*} rad - to rotate
 * @returns
 */
export function calcProjectedRectSizeOfRotatedRect(width, height, rad) {
  const rectProjectedWidth = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
  const rectProjectedHeight = Math.abs(width * Math.sin(rad)) + Math.abs(height * Math.cos(rad));

  return { width: rectProjectedWidth, height: rectProjectedHeight };
}

/**
 * Gets pixel data from imageData
 * @param {*} imageData
 * @param {*} x
 * @param {*} y
 * @returns
 */
export function getPixel(imageData, x, y) {
  var color = {};
  color['r'] = imageData.data[((y * (imageData.width * 4)) + (x * 4)) + 0];
  color['g'] = imageData.data[((y * (imageData.width * 4)) + (x * 4)) + 1];
  color['b'] = imageData.data[((y * (imageData.width * 4)) + (x * 4)) + 2];
  color['a'] = imageData.data[((y * (imageData.width * 4)) + (x * 4)) + 3];
  return color
}

/**
 * Returns a 2D matrix of size with CMYK color values from image data
 * @param {*} imageData
 * @param {*} x
 * @param {*} y
 * @param {*} size
 * @returns
 */
export function getMatrix(imageData, x, y, size) {
  const matrix = [...Array(size)].map(() => ([...Array(size)].map(() => 0)))
  if (x + size > imageData.width || y + size > imageData.height) return
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const pixel = getPixel(imageData, x + i, y + j)
      if (pixel.a === 0) continue
      matrix[i][j] = convertRGBToCMYK(pixel)
    }
  }

  return matrix
}

/**
 * Calculates the average value of a specific channel in a color matrix
 * @param {*} matrix
 * @param {*} channel
 * @returns
 */
export function averageChannelValueFromMatrix(matrix, channel) {
  const flat = flatten(matrix)
  const total = flat.reduce((a, e) => a + e[channel], 0)
  const avg = total / flat.length
  return avg
}

/**
 * converts rads to degs
 * @param {} rad
 * @returns
 */
export function radToDeg(rad) {
  return 180 / pi * rad
}

/**
 * converts degress to radians
 * @param {} rad
 * @returns
 */
export function degToRad(deg) {
  return deg * pi / 180 || 0
}

export function toImageDataIndex(imageData, x, y) {
  return (y * imageData.width * 4) + (x * 4)
}

export function getRotatedImage(image, ctx, degree) {
  const rad = degToRad(degree)

  const { width: rotatedWidth, height: rotatedHeight } = calcProjectedRectSizeOfRotatedRect(
    image.width, image.height, rad
  );

  ctx.canvas.width = rotatedWidth;
  ctx.canvas.height = rotatedHeight;
  const { xOrigin, yOrigin } = getRotationOrigin(image.width, image.height, degree)

  ctx.translate(xOrigin, yOrigin)
  ctx.rotate(rad);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
  return { xOrigin, yOrigin }
}

export function canvasToImage(canvas) {
  const image = new Image()
  image.src = canvas.toDataURL()
  return image
}

export function getRotationOrigin(width, height, degree) {
  const boundaryRad = Math.atan(width / height);
  const rad = degToRad(degree)
  const { width: rotatedWidth, height: rotatedHeight } = calcProjectedRectSizeOfRotatedRect(
    width, height, rad
  );

  const sin_Height = height * Math.abs(Math.sin(rad))
  const cos_Height = height * Math.abs(Math.cos(rad))
  const cos_Width = width * Math.abs(Math.cos(rad))
  const sin_Width = width * Math.abs(Math.sin(rad))

  let xOrigin, yOrigin;

  // comments would be for a square
  if (rad < boundaryRad) { // < 45deg
    xOrigin = Math.min(sin_Height, cos_Width);
    yOrigin = 0;
  } else if (rad < Math.PI / 2) { // < 90 deg
    xOrigin = Math.max(sin_Height, cos_Width);
    yOrigin = 0;
  } else if (rad < Math.PI / 2 + boundaryRad) { // < 135
    xOrigin = rotatedWidth;
    yOrigin = Math.min(cos_Height, sin_Width);
  } else if (rad < Math.PI) { // < 180
    xOrigin = rotatedWidth;
    yOrigin = Math.max(cos_Height, sin_Width);
  } else if (rad < Math.PI + boundaryRad) { // < 225
    xOrigin = Math.max(sin_Height, cos_Width);
    yOrigin = rotatedHeight;
  } else if (rad < Math.PI / 2 * 3) { // < 270
    xOrigin = Math.min(sin_Height, cos_Width);
    yOrigin = rotatedHeight;
  } else if (rad < Math.PI / 2 * 3 + boundaryRad) { //< 315
    xOrigin = 0;
    yOrigin = Math.max(cos_Height, sin_Width);
  } else if (rad < Math.PI * 2) { // < 360
    xOrigin = 0;
    yOrigin = Math.min(cos_Height, sin_Width);
  }
  console.log('xOrigin, yOrigin', xOrigin, yOrigin)
  return { xOrigin, yOrigin }
}


export function changeCanvasAspectRatio(originalCanvas, newAspectRatio) {
  // Calculate the new width and height
  let newWidth, newHeight;
  if (newAspectRatio > originalCanvas.width / originalCanvas.height) {
    newWidth = originalCanvas.width;
    newHeight = originalCanvas.width / newAspectRatio;
  } else {
    newWidth = originalCanvas.height * newAspectRatio;
    newHeight = originalCanvas.height;
  }

  // Calculate the position to center the content
  // const offsetX = (newWidth - originalCanvas.width) / 2;
  // const offsetY = (newHeight - originalCanvas.height) / 2;

  // calculate the new size of the image
  let newImageWidth = newWidth
  let newImageHeight = newWidth * originalCanvas.height / originalCanvas.width

  // Create a temporary canvas to hold the updated content
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = newWidth;
  tempCanvas.height = newHeight;
  const tempContext = tempCanvas.getContext("2d");

  // Clear the temporary canvas
  tempContext.clearRect(0, 0, newWidth, newHeight);

  // Draw the original canvas onto the temporary canvas with appropriate transformation
  tempContext.drawImage(originalCanvas, 0, 0, newImageWidth, newImageHeight);

  // Update the original canvas with the new content
  originalCanvas.width = newWidth;
  originalCanvas.height = newHeight;
  const originalContext = originalCanvas.getContext("2d");
  originalContext.clearRect(0, 0, newWidth, newHeight);
  originalContext.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
}

export function triangularNumber(n) {
  return n * (n + 1) / 2
}