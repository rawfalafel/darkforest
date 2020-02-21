export enum PlanetType {
  None,
  LittleAsteroid,
  BigAsteroid,
  BrownDwarf,
  RedDwarf,
  WhiteDwarf,
  YellowStar,
  BlueStar,
  SubGiant,
  Giant,
  SuperGiant,
  HyperGiant,
}
export enum MiningPatternType {
  Home,
  Target,
  Spiral,
  Cone,
  Grid,
  ETH,
}
export enum GridPatternType {
  Row,
  Column,
}

export enum ConePatternDirection {
  Up,
  Left,
  Right,
  Down,
}
export enum ConePatternAngle {
  _ZERO_NEVER_USED, //not used, just for some hacky stuff
  ONE,
  TWO,
  THREE,
}