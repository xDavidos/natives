---
ns: CFX
apiset: server
---
## TASK_WARP_PED_INTO_VEHICLE

```c
void TASK_WARP_PED_INTO_VEHICLE(Ped ped, Vehicle vehicle, int seatIndex);
```

```
NativeDB Introduced: v323
```
Warp a ped into a vehicle.
**Note**: It's better to use [`TASK_ENTER_VEHICLE`](#\_0xC20E50AA46D09CA8) with the flag "warp" flag instead of this native.

**This is the server-side RPC native equivalent of the client native [TASK\_WARP\_PED\_INTO\_VEHICLE](?_0x9A7D091411C5F684).**

## Parameters
* **ped**: The Ped to be warped into the vehicle.
* **vehicle**: The target vehicle into which the ped will be warped.
* **seatIndex**: See eSeatPosition declared in [`IS_VEHICLE_SEAT_FREE`](#\_0x22AC59A870E6A669).

