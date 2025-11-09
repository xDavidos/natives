import { log } from "console";
import { glob } from "fast-glob";
import { FileUtils } from "../utils/file-utils";
import parseMD from "parse-md";
import { Native, TFuncParam } from "../models/native";
import { MdParser } from "../utils/md-parser";
import { camelCase, kebabCase, pascalCase } from "change-case";
import { joaat } from "../joaat";
import { TypeResolver } from "../utils/type-resolver";
import { CFX_CLIENT_PROJECT_NAME, CFX_SERVER_PROJECT_NAME, CFX_SHARED_PROJECT_NAME, MODELS_PROJECT_NAME } from "../const";
import { writeFile } from "fs/promises";
import path from "path";
import { buildFivemTypes, buildPackageJson, buildTsConfig } from "../utils/build-package";
import { execSync } from "child_process";

type TCfxMetadata = {
    ns: string;
    game: string;
    apiset: string;
}

type TFunctionSignature = {
    returnType: string;
    functionName: string;
    params: { name: string, type: string }[];
}

export class CfxParser {
    private readonly _inFolder: string;
    private readonly _outFolder: string;

    constructor(inFolder: string, outFolder: string) {
        this._inFolder = inFolder;
        this._outFolder = outFolder;
    }

    public async parse(): Promise<void> {
        const files = await glob(`${this._inFolder}/**/*.md`);

        const sharedFunctions: Native[] = [];
        const serverFunctions: Native[] = [];
        const clientFunctions: Native[] = [];

        for (const file of files) {
            const fileContent = await FileUtils.readFile(file);

            if (MdParser.removeTextStyle(fileContent) === 'FUNCTION_DELETED') {
                log(`Skipping ${file} because it's deleted`);
                continue
            }

            const { metadata } = parseMD(fileContent) as { metadata: TCfxMetadata };

            if (metadata.game && metadata.game !== 'gta5') {
                log(`Skipping ${file} because it's for ${metadata.game}`);
                continue;
            }

            const code = MdParser.parseCode(fileContent);
            let name = fileContent.split('\n').find(x => x.includes('##'));

            if (!name) {
                throw new Error(`Failed to parse name from ${file}`);
            }


            name = MdParser.removeTextStyle(name);
            const isNative = TypeResolver.hasNative(name);

            const native = this._parseNative(code, file, fileContent, metadata, name);

            if (isNative) {
                if (metadata.apiset !== 'server') {
                    throw new Error(`Failed to parse ${file} because it's not a server native`);
                }

                const existingNative = TypeResolver.getNative(name);
                const serverNative = new Native(CFX_SERVER_PROJECT_NAME, this._inFolder, metadata.ns, existingNative.nativeName, existingNative.name, CfxParser._makeHashFromName(name), native.parameters, existingNative.returnType, existingNative.notes);
                serverFunctions.push(serverNative);
                continue;
            }


            if (metadata.apiset === 'shared') {
                sharedFunctions.push(native);
            } else if (metadata.apiset === 'client') {
                clientFunctions.push(native);
            } else if (metadata.apiset === 'server') {
                serverFunctions.push(native);
            } else {
                throw new Error(`Unknown apiset ${metadata.apiset}`);
            }
        }

        const writeNatives = async (project: string, funcs: Native[]): Promise<void> => {
            const folder = path.join(this._outFolder, project);
            const srcFolder = path.join(folder, 'src');
            await FileUtils.mkdir(srcFolder);
            const fileNames: string[] = [];

            await Promise.all(funcs.map(async (func) => {
                const content = func.compile();
                const fileName = kebabCase(func.name) + '.ts';
                await writeFile(path.join(srcFolder, fileName), content);
                fileNames.push(fileName);
            }))

            const index = fileNames.map(x => `export * from './${x.replace('.ts', '')}';`).join('\n');
            await writeFile(`${srcFolder}/index.ts`, index, 'utf-8');

            const dtsFile = 'index.d.ts';
            const tsConfig = buildTsConfig([dtsFile]);
            const pkgJson = buildPackageJson(project, [MODELS_PROJECT_NAME]);
            await writeFile(path.join(folder, dtsFile), buildFivemTypes(), 'utf-8');
            await writeFile(path.join(folder, 'package.json'), JSON.stringify(pkgJson, null, 2));
            await writeFile(path.join(folder, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
        }

        await Promise.all([
            writeNatives(CFX_SHARED_PROJECT_NAME, sharedFunctions),
            writeNatives(CFX_CLIENT_PROJECT_NAME, clientFunctions),
            writeNatives(CFX_SERVER_PROJECT_NAME, serverFunctions),
        ]);
    }

    private _parseNative(code: string[], file: string, fileContent: string, metadata: TCfxMetadata, name: string): Native {
        let func: TFunctionSignature | undefined = undefined;
        let afterCodeText = '';

        for (const codeBlock of code) {
            const f = CfxParser._parseFunction(codeBlock);
            if (f.functionName !== name) {
                log(f.functionName, name)
                continue;
            }
            func = f;
            if (func) {
                const len = fileContent.indexOf(codeBlock) + codeBlock.length;
                const content = fileContent.substring(len).split('\n').map(x => x.trim()).filter(Boolean);

                for (let i = 1; i < content.length; i++) {
                    const line = content[i].trim();
                    if (line.startsWith('##')) {
                        let nextFound = false;
                        for (let j = i + 1; j < content.length; j++) {
                            const line2 = content[j].trim();
                            if (line2.startsWith('##')) {
                                i = j - 1;
                                nextFound = true;
                                break;
                            }
                        }
                        if (!nextFound) {
                            break;
                        }
                    } else {
                        afterCodeText += line + '\r';
                    }
                }

                break;
            }
        }



        if (!func) {
            throw new Error(`Failed to parse function from ${file}`);
        }



        let funcReturnType = func.returnType;
        const isArray = funcReturnType.endsWith('[]');

        if (isArray) {
            funcReturnType = funcReturnType.substring(0, funcReturnType.length - 2);
        }

        let returnType = TypeResolver.getType(funcReturnType);

        if (!returnType) {
            throw new Error(`Failed to parse ${funcReturnType} from ${file}`);
        }

        const retAlias = TypeResolver.getAlias(funcReturnType);

        if (retAlias) {
            returnType = TypeResolver.getType(retAlias)!;
        }

        const parametersSection = MdParser.parseSection('Parameters', fileContent)
            .split('\n')
            .map(x => MdParser.removeTextStyle(x))
            .filter(Boolean)
            .reduce((acc, x) => {
                if (x.startsWith('* ')) {
                    x = x.substring(2);
                }
                const [name, comment] = x.split(':').map(x => x.trim());
                acc[name] = comment;
                return acc;
            }, {} as Record<string, string>);

        const params: TFuncParam[] = func.params.map(param => {
            let field = MdParser.parseField(`${param.type} ${param.name}`);

            if (field.type === "char" && field.isPointer) {
                field.type = 'string';
                field.isPointer = false;
            }

            let type = TypeResolver.getType(field.type);

            if (!type) {
                throw new Error(`Failed to parse ${param.name}: ${param.type} from ${file}`);
            }

            const alias = TypeResolver.getAlias(field.type);

            if (alias) {
                type = TypeResolver.getType(alias)!;
            }

            field.comment = parametersSection[param.name];

            return { type, field };
        })

        let projectName: string = '';

        if (metadata.apiset === 'client') {
            projectName = CFX_CLIENT_PROJECT_NAME;
        }

        if (metadata.apiset === 'server') {
            projectName = CFX_SERVER_PROJECT_NAME;
        }

        if (metadata.apiset === 'shared') {
            projectName = CFX_CLIENT_PROJECT_NAME;
        }

        if (!projectName) {
            throw new Error(`Failed to parse project name from ${file}`);
        }

        const returns = MdParser.parseSection('Return value', fileContent).trim();

        if (func.functionName === 'CREATE_RUNTIME_TEXTURE') {
            log({ returns });
        }

        return new Native(projectName, this._inFolder, metadata.ns, func.functionName, camelCase(name), CfxParser._makeHashFromName(name), params, { ...returnType, name: '', isArray, comment: returns }, afterCodeText.split('\n').map(x => x.trim()).filter(Boolean));
    }

    private static _parseFunction(code: string): TFunctionSignature {
        // Regular expression to capture return type, function name, and parameters
        const regex = /([\w\s\*\[\]]+)\s+(\w+)\s*\(([^)]*)\);/;
        const match = code.match(regex);

        if (match) {
            const returnType = match[1];  // Capture group 1: return type
            const functionName = match[2];  // Capture group 2: function name
            const params = match[3];  // Capture group 3: parameters

            // Split the parameters by comma and trim whitespace
            const paramList = params.split(',').map(param => param.trim()).filter(Boolean);
            // Map the paramList to return objects with type and name
            const parsedParams = paramList.map(param => {
                const [type, name] = param.split(/\s+/); // Split each param into type and name
                return { type, name };
            });

            return {
                returnType,
                functionName,
                params: parsedParams
            };
        } else {
            return null!;
        }
    }

    private static _makeHashFromName(name: string): string {
        return '0x' + joaat(name).toString(16).toUpperCase();
    }
}