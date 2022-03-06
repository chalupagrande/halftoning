import { flatten, xor } from 'lodash';
export const pi = Math.PI
/**
 * Converts rgba to cmyk
 * @param {*} rgbaColorObject - Object with r,g,b and a values for red green blue and alpha
 * @returns object - with c,m,y,k values
 */
export function convertRGBToCMYK(rgbaColorObject){
  const rRatio = rgbaColorObject.r / 255
  const gRatio = rgbaColorObject.g / 255
  const bRatio = rgbaColorObject.b / 255
  const k = 1 - Math.max(rRatio,gRatio,bRatio)
  const c = (1 - rRatio - k) / (1 - k)
  const m = (1 - gRatio - k) / (1 - k)
  const y = (1 - bRatio - k) / (1 - k)
  return {c,m,y,k}
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
export function getPixel(imageData, x,y){
  var color = {};
  color['r'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 0];
  color['g'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 1];
  color['b'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 2];
  color['a'] = imageData.data[((y*(imageData.width*4)) + (x*4)) + 3];
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
export function getMatrix(imageData, x, y, size){
  const matrix = [...Array(size)].map(() => ([...Array(size)].map(() => 0)))
  if(x + size > imageData.width || y + size > imageData.height) return
  for(let i = 0; i < size; i++){
    for(let j = 0; j < size; j++){
      matrix[i][j] = convertRGBToCMYK(getPixel(imageData, x + i, y + j))
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
export function averageChannelValueFromMatrix(matrix, channel){
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
export function radToDeg(rad){
  return 180/pi * rad
}

/**
 * converts degress to radians
 * @param {} rad
 * @returns
 */
export function degToRad(deg){
  return deg * pi / 180 || 0
}

export function toImageDataIndex(imageData, x,y){
  return (y * imageData.width * 4) + (x*4)
}

export function getRotatedImage(image, ctx, degree) {
  const rad = degToRad(degree)

  const { width: rotatedWidth, height: rotatedHeight } = calcProjectedRectSizeOfRotatedRect(
    image.width, image.height, rad
  );

  ctx.canvas.width = rotatedWidth;
  ctx.canvas.height = rotatedHeight;
  const {xOrigin, yOrigin} = getRotationOrigin(image.width, image.height, degree)

  ctx.translate(xOrigin, yOrigin)
  ctx.rotate(rad);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
  return {xOrigin, yOrigin}
}

export function canvasToImage(canvas){
  const image = new Image()
  image.src = canvas.toDataURL()
  return image
}

export function getRotationOrigin(width, height, degree) {
  const boundaryRad = Math.atan(width / height);
  console.log(radToDeg(boundaryRad))
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
    console.log('case1');
    xOrigin = Math.min(sin_Height, cos_Width);
    yOrigin = 0;
  } else if (rad < Math.PI / 2) { // < 90 deg
    console.log('case2');
    xOrigin = Math.max(sin_Height, cos_Width);
    yOrigin = 0;
  } else if (rad < Math.PI / 2 + boundaryRad) { // < 135
    console.log('case3');
    xOrigin = rotatedWidth;
    yOrigin = Math.min(cos_Height, sin_Width);
  } else if (rad < Math.PI) { // < 180
    console.log('case4');
    xOrigin = rotatedWidth;
    yOrigin = Math.max(cos_Height, sin_Width);
  } else if (rad < Math.PI + boundaryRad) { // < 225
    console.log('case5');
    xOrigin = Math.max(sin_Height, cos_Width);
    yOrigin = rotatedHeight;
  } else if (rad < Math.PI / 2 * 3) { // < 270
    console.log('case6');
    xOrigin = Math.min(sin_Height, cos_Width);
    yOrigin = rotatedHeight;
  } else if (rad < Math.PI / 2 * 3 + boundaryRad) { //< 315
    console.log('case7');
    xOrigin = 0;
    yOrigin = Math.max(cos_Height, sin_Width);
  } else if (rad < Math.PI * 2) { // < 360
    console.log('case8');
    xOrigin = 0;
    yOrigin = Math.min(cos_Height, sin_Width);
  }
  console.log('xOrigin, yOrigin', xOrigin, yOrigin)
  return {xOrigin, yOrigin}
}
