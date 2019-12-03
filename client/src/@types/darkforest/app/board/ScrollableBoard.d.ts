import { Location, LocationId } from '../../../global/global';

export enum PlanetType {
  Unoccupied,
  Mine,
  Enemy,
}

export interface PlanetViewDescription {
  location: Location;
  type: PlanetType;
  population: number;
}
