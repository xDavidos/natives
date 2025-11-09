---
ns: CFX
apiset: server
---
## REMOVE_BLIP

```c
void REMOVE_BLIP(Blip* blip);
```

Removes the blip from your map.
**Note:** This function only works on the script that created the blip, if you wish to remove blips created by other scripts, see [`SET_THIS_SCRIPT_CAN_REMOVE_BLIPS_CREATED_BY_ANY_SCRIPT`](#\_0xB98236CAAECEF897).

**This is the server-side RPC native equivalent of the client native [REMOVE\_BLIP](?_0x86A652570E5F25DD).**

## Parameters
* **blip**: Blip handle to remove.

