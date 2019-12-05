import { Location } from '../../../global/global';

export enum PlanetViewType {
  Unoccupied,
  Mine,
  Enemy,
}

export interface PlanetViewDescription {
  location: Location;
  type: PlanetViewType;
  population: number;
}
