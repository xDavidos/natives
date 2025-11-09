---
ns: CFX
apiset: server
---
## SET_PED_HEAD_BLEND_DATA

```c
void SET_PED_HEAD_BLEND_DATA(Ped ped, int shapeFirstID, int shapeSecondID, int shapeThirdID, int skinFirstID, int skinSecondID, int skinThirdID, float shapeMix, float skinMix, float thirdMix, BOOL isParent);
```

For more info and the list of faceIDs please refer to [this](https://gtaforums.com/topic/858970-all-gtao-face-ids-pedset-ped-head-blend-data-explained) topic. Note that the Skin and Shape IDs are shared. This native will use this same list for both Skin and Shape IDs.
**Other information:**
IDs start at zero and go Male Non-DLC, Female Non-DLC, Male DLC, and Female DLC.
This native function is often called prior to calling natives such as:
*   [`SetPedHairColor`](#\_0xA23FE32C)
*   [`SetPedHeadOverlayColor`](#\_0x78935A27)
*   [`SetPedHeadOverlay`](#\_0xD28DBA90)
*   [`SetPedFaceFeature`](#\_0x6C8D4458)

**This is the server-side RPC native equivalent of the client native [SET\_PED\_HEAD\_BLEND\_DATA](?_0x9414E18B9434C2FE).**

## Parameters
* **ped**: The ped entity
* **shapeFirstID**: Controls the shape of the first ped's face
* **shapeSecondID**: Controls the shape of the second ped's face
* **shapeThirdID**: Controls the shape of the third ped's face
* **skinFirstID**: Controls the first id's skin tone
* **skinSecondID**: Controls the second id's skin tone
* **skinThirdID**: Controls the third id's skin tone
* **shapeMix**: 0.0 - 1.0 Of whose characteristics to take Mother -> Father (shapeFirstID and shapeSecondID)
* **skinMix**: 0.0 - 1.0 Of whose characteristics to take Mother -> Father (skinFirstID and skinSecondID)
* **thirdMix**: Overrides the others in favor of the third IDs.
* **isParent**: IsParent is set for "children" of the player character's grandparents during old-gen character creation. It has unknown effect otherwise.

