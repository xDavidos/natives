import { cp, readdir, rmdir, writeFile, mkdir } from "fs/promises";
import { EnumParser } from "./parsers/enum.parser";
import { NativeParser } from "./parsers/native.parser";
import { StructParser } from "./parsers/struct.parser";
import { TypedefsParser } from "./parsers/typedefs.parser";
import path from "path";
import { TypeResolver } from "./utils/type-resolver";
import { FileUtils } from "./utils/file-utils";
import { CFX_CLIENT_PROJECT_NAME, CFX_SERVER_PROJECT_NAME, CFX_SHARED_PROJECT_NAME, ENUMS_FOLDER, FUNCTIONS_FOLDER, MODELS_PROJECT_NAME, NATIVES_PROJECT_NAME, STRUCTS_FOLDER, TYPEDEFS_FOLDER } from "./const";
import { CfxParser } from "./parsers/cfx.parser";
import { buildFivemTypes, buildMonorepoPackageJson, buildPackageJson, buildProjectPath, buildTsConfig } from "./utils/build-package";
import { execSync } from "child_process";



const buildModels = async (outFolder: string) => {
    FileUtils.setReplacement('native-db/enums/PED_CONFIG_FLAGS.md', 'replacements/PED_CONFIG_FLAGS.md')
    FileUtils.setReplacement('native-db/enums/PED_RESET_FLAGS.md', 'replacements/PED_RESET_FLAGS.md')
    FileUtils.setReplacement('native-db/enums/VEHICLE_SEAT.md', 'replacements/VEHICLE_SEAT.md')
    FileUtils.setReplacement('native-db/enums/APPLY_FORCE_TYPE.md', 'replacements/APPLY_FORCE_TYPE.md')

    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'vector3.ts', folder: 'types', nativeName: 'vector', runtimeName: 'Vector3' }, 24);
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'int-ref.ts', folder: 'types', nativeName: 'int*', runtimeName: 'IntRef' }, 8);
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'float-ref.ts', folder: 'types', nativeName: 'float*', runtimeName: 'FloatRef' }, 8);
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'string-ref.ts', folder: 'types', nativeName: 'string*', runtimeName: 'StringRef' }, 0);
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'bool-ref.ts', folder: 'types', nativeName: 'bool*', runtimeName: 'BoolRef' }, 8);
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'vector-ref.ts', folder: 'types', nativeName: 'Vector3Ref', runtimeName: 'Vector3Ref' }, 0);
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'vector-ref.ts', folder: 'types', nativeName: 'Vector3*', runtimeName: 'Vector3Ref' }, 0);
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'vector-ref.ts', folder: 'types', nativeName: 'Vector3', runtimeName: 'Vector3Ref' }, 0);

    const modelsOutFolder = path.join(outFolder, MODELS_PROJECT_NAME);
    const modelsSrc = path.join(modelsOutFolder, 'src');

    await rmdir(modelsSrc, { recursive: true }).catch(() => { });
    await mkdir(modelsSrc, { recursive: true });
    await cp(path.resolve(__dirname, 'types'), `${modelsSrc}/types`, { recursive: true });

    const typedefsParser = new TypedefsParser(`native-db/${TYPEDEFS_FOLDER}`, `${modelsSrc}/${TYPEDEFS_FOLDER}`);
    await typedefsParser.parse();

    const enumParser = new EnumParser(`native-db/${ENUMS_FOLDER}`, `${modelsSrc}/${ENUMS_FOLDER}`);
    await enumParser.parse();

    const structParser = new StructParser(`native-db/${STRUCTS_FOLDER}`, `${modelsSrc}/${STRUCTS_FOLDER}`);
    await structParser.parse();

    const folders = await readdir(modelsSrc);
    const index = folders.map((folder) => `export * from './${folder}';`).join('\n');
    await writeFile(`${modelsSrc}/index.ts`, index);

    const packageJson = buildPackageJson(MODELS_PROJECT_NAME);
    const tsConfig = buildTsConfig();
    await writeFile(`${modelsOutFolder}/package.json`, JSON.stringify(packageJson, null, 2));
    await writeFile(`${modelsOutFolder}/tsconfig.json`, JSON.stringify(tsConfig, null, 2));
}


const buildNatives = async (outFolder: string) => {
    const nativesOutFolder = path.join(outFolder, NATIVES_PROJECT_NAME);
    const src = 'src';
    const nativesSrc = path.join(nativesOutFolder, src);

    const nativeParser = new NativeParser(`native-db/${FUNCTIONS_FOLDER}`, nativesSrc);
    await nativeParser.parse();

    const packageJson = buildPackageJson(NATIVES_PROJECT_NAME, [MODELS_PROJECT_NAME]);
    const dtsFile = 'index.d.ts';
    const tsConfig = buildTsConfig([dtsFile]);
    await writeFile(path.join(nativesOutFolder, dtsFile), buildFivemTypes(), 'utf-8');
    await writeFile(path.join(nativesOutFolder, 'package.json'), JSON.stringify(packageJson, null, 2));
    await writeFile(path.join(nativesOutFolder, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));

}

const parseCfx = async (outFolder: string) => {
    FileUtils.setReplacement('native-decls/AddStateBagChangeHandler.md', 'replacements/AddStateBagChangeHandler.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'state-bag-change-handler.ts', folder: 'types', nativeName: 'StateBagChangeHandler', runtimeName: 'StateBagChangeHandler' }, 8);

    FileUtils.setReplacement('native-decls/RegisterArchetypes.md', 'replacements/RegisterArchetypes.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'archetypes-factory.ts', folder: 'types', nativeName: 'ArchetypesFactory', runtimeName: 'ArchetypesFactory' }, 8);

    FileUtils.setReplacement('native-decls/RegisterCommand.md', 'replacements/RegisterCommand.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'command-handler.ts', folder: 'types', nativeName: 'CommandHandler', runtimeName: 'CommandHandler' }, 8);
    FileUtils.setReplacement('native-decls/GetResourceCommands.md', 'replacements/GetResourceCommands.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'command-handler.ts', folder: 'types', nativeName: 'ResourceCommand', runtimeName: 'ResourceCommand' }, 136);

    FileUtils.setReplacement('native-decls/RegisterConsoleListener.md', 'replacements/RegisterConsoleListener.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'console-listener.ts', folder: 'types', nativeName: 'ConsoleListener', runtimeName: 'ConsoleListener' }, 8);

    FileUtils.setReplacement('native-decls/RegisterEntities.md', 'replacements/RegisterEntities.md')

    FileUtils.setReplacement('native-decls/RegisterNuiCallback.md', 'replacements/RegisterNuiCallback.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'nui-callback.ts', folder: 'types', nativeName: 'NuiCallback', runtimeName: 'NuiCallback' }, 8);

    FileUtils.setReplacement('native-decls/RegisterRawNuiCallback.md', 'replacements/RegisterRawNuiCallback.md')

    FileUtils.setReplacement('native-decls/RegisterResourceBuildTaskFactory.md', 'replacements/RegisterResourceBuildTaskFactory.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'resource-build-task-factory.ts', folder: 'types', nativeName: 'ResourceBuildTaskFactory', runtimeName: 'ResourceBuildTaskFactory' }, 8);

    FileUtils.setReplacement('native-decls/SetHttpHandler.md', 'replacements/SetHttpHandler.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'http-handler.ts', folder: 'types', nativeName: 'HttpHandler', runtimeName: 'HttpHandler' }, 8);

    FileUtils.setReplacement('native-decls/server/ScanResourceRoot.md', 'replacements/ScanResourceRoot.md')

    FileUtils.setReplacement('native-decls/DoorSystemGetActive.md', 'replacements/DoorSystemGetActive.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'door-system-active-door.ts', folder: 'types', nativeName: 'DoorSystemActiveDoor', runtimeName: 'DoorSystemActiveDoor' }, 8);

    FileUtils.setReplacement('native-decls/GetActivePlayers.md', 'replacements/GetActivePlayers.md')
    FileUtils.setReplacement('native-decls/GetAllObjects.md', 'replacements/GetAllObjects.md')
    FileUtils.setReplacement('native-decls/GetAllPeds.md', 'replacements/GetAllPeds.md')
    FileUtils.setReplacement('native-decls/GetAllRopes.md', 'replacements/GetAllRopes.md')
    FileUtils.setReplacement('native-decls/GetAllVehicleModels.md', 'replacements/GetAllVehicleModels.md')
    FileUtils.setReplacement('native-decls/GetAllVehicles.md', 'replacements/GetAllVehicles.md')
    FileUtils.setReplacement('native-decls/GetAllTrackJunctions.md', 'replacements/GetAllTrackJunctions.md')

    FileUtils.setReplacement('native-decls/GetGamePool.md', 'replacements/GetGamePool.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'pool-name.enum.ts', folder: 'types', nativeName: 'ePoolName', runtimeName: 'EPoolName' }, 8);

    FileUtils.setReplacement('native-decls/GetPedDecorations.md', 'replacements/GetPedDecorations.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'ped-decoration.ts', folder: 'types', nativeName: 'PedDecoration', runtimeName: 'PedDecoration' }, 8);

    FileUtils.setReplacement('native-decls/GetRegisteredCommands.md', 'replacements/GetRegisteredCommands.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'registered-command.ts', folder: 'types', nativeName: 'RegisteredCommand', runtimeName: 'RegisteredCommand' }, 8);

    FileUtils.setReplacement('native-decls/GetStateBagKeys.md', 'replacements/GetStateBagKeys.md')
    FileUtils.setReplacement('native-decls/GetStateBagValue.md', 'replacements/GetStateBagValue.md')
    FileUtils.setReplacement('native-decls/PerformHttpRequestInternalEx.md', 'replacements/PerformHttpRequestInternalEx.md')
    FileUtils.setReplacement('native-decls/sdk/UpdateMapdataEntity.md', 'replacements/UpdateMapdataEntity.md')
    
    FileUtils.setReplacement('native-decls/DoesEntityExist.md', 'replacements/DoesEntityExist.md')

    FileUtils.setReplacement('native-decls/AddConvarChangeListener.md', 'replacements/AddConvarChangeListener.md')

    FileUtils.setReplacement('native-decls/FormatStackTrace.md', 'replacements/FormatStackTrace.md')

    FileUtils.setReplacement('native-decls/GetClosestTrackNodes.md', 'replacements/GetClosestTrackNodes.md')
    TypeResolver.addType({ project: MODELS_PROJECT_NAME, fileName: 'track-node.ts', folder: 'types', nativeName: 'TrackNode', runtimeName: 'TrackNode' }, 8);

    FileUtils.setReplacement('native-decls/GetEntitiesInRadius.md', 'replacements/GetEntitiesInRadius.md')

    FileUtils.setReplacement('native-decls/GetVehicleDoorStatus.md', 'replacements/GetVehicleDoorStatus.md')

    const registerTypeAlias = (source: string, nativeName: string, runtimeName = nativeName) => {
        const type = TypeResolver.getType(source);

        if (!type) {
            throw new Error(`Failed to find type ${source}`);
        }

        TypeResolver.addAlias(nativeName, source);
        TypeResolver.addAlias(runtimeName, source);
        TypeResolver.addType({
            ...type, nativeName, runtimeName,
        }, TypeResolver.getTypeSize(source)!);
    }

    registerTypeAlias('ENTITY_INDEX', 'Entity');
    registerTypeAlias('int*', 'Entity*');
    registerTypeAlias('int*', 'Hash*');
    registerTypeAlias('int*', 'Object*');
    registerTypeAlias('VEHICLE_INDEX', 'Vehicle');
    registerTypeAlias('VEHICLE_INDEX', 'Vehicle*', 'VehicleIndex');
    registerTypeAlias('CAMERA_INDEX', 'Cam');
    registerTypeAlias('PED_INDEX', 'Ped');
    registerTypeAlias('PED_INDEX', 'Ped*', 'PedIndex');
    registerTypeAlias('PLAYER_INDEX', 'Player');
    registerTypeAlias('PLAYER_INDEX', 'Player*');
    registerTypeAlias('BLIP_INDEX', 'Blip')
    registerTypeAlias('BLIP_INDEX', 'Blip*')
    registerTypeAlias('Any', 'Any*')


    const cfxParser = new CfxParser(`native-decls`, `${outFolder}`);
    await cfxParser.parse();
}

const main = async () => {
    const outFolder = 'out';
    await rmdir(outFolder, { recursive: true }).catch(() => { });
    await mkdir(outFolder, { recursive: true });
    await writeFile(path.join(outFolder, 'package.json'), JSON.stringify(buildMonorepoPackageJson([NATIVES_PROJECT_NAME, MODELS_PROJECT_NAME, CFX_SERVER_PROJECT_NAME, CFX_CLIENT_PROJECT_NAME, CFX_SHARED_PROJECT_NAME]), null, 2), 'utf-8');

    await buildModels(outFolder);
    await buildNatives(outFolder);
    await parseCfx(outFolder);

    execSync('yarn', { cwd: outFolder, stdio: 'inherit' });
    execSync(`yarn workspace ${buildProjectPath(MODELS_PROJECT_NAME)} build`, { cwd: outFolder, stdio: 'inherit' });

    [NATIVES_PROJECT_NAME, CFX_SERVER_PROJECT_NAME, CFX_CLIENT_PROJECT_NAME, CFX_SHARED_PROJECT_NAME]
    .map(x => `yarn workspace ${buildProjectPath(x)} build`)
    .map(x => execSync(x, { cwd: outFolder, stdio: 'inherit' }));

}

main();