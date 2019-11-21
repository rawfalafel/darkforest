import {Address, LocationId} from "../@types/global/global";
import * as bigInt from "big-integer";
import {LOCATION_ID_UB} from "./constants";

// constructors for specific types
// see https://stackoverflow.com/questions/51813272/declaring-string-type-with-min-max-length-in-typescript
export const locationId: (str: string) => LocationId = str => {
    const locationBI = bigInt(str);
    if (locationBI.geq(LOCATION_ID_UB)) throw new Error("not a valid location");
    let ret = locationBI.toString(16);
    while (ret.length < 64) ret = '0' + ret;
    return <LocationId>ret;
};

export const address: (str: string) => Address = str => {
    let ret = str.toLowerCase();
    for (let c of str) {
      if ('0123456789abcdef'.indexOf(c) === -1) throw new Error("not a valid address");
    }
    if (ret.length > 40) throw new Error("not a valid address");
    while (ret.length < 40) ret = '0' + ret;
    return <Address>ret;
};