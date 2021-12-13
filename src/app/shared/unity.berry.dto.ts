export class UnityBerryDTO {
  constructor(
    trait: string,
    classification: string,
    imagepath: string,
    image: string
  ) {
    this.trait = trait
    this.classification = classification
    this.imagePath = imagepath
    this.image = image
  }

  public trait: string = '0'
  public classification: string = '0'
  public imagePath: string = '0'
  public image: string = '0'
}
