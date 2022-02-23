export const environment = {
  production: true,
  aesKey: {
    "key_ops": [
      "decrypt",
      "encrypt"
    ],
    "ext": true,
    "kty": "oct",
    "k": "8se6O7K1kUmmE4ipFURXig6GygErAnW1Yw75ypcZAso",
    "alg": "A256GCM"
  },
  iv: new Uint8Array([ 138, 34, 38, 4, 144, 89, 15, 5, 155, 11, 244, 21])
};
