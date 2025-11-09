import { mkdir, readdir, readFile, rmdir, writeFile } from "fs/promises";
import path from "path";
import { Native, TFuncParam } from "../models/native";
import { camelCase, kebabCase } from "change-case";
import { MdParser } from "../utils/md-parser";
import { TypeResolver } from "../utils/type-resolver";
import { NATIVES_PROJECT_NAME } from "../const";

export class NativeParser {
    private readonly _inFolder: string;
    private readonly _outFolder: string;

    constructor(inFolder: string, outFolder: string) {
        this._inFolder = inFolder;
        this._outFolder = outFolder;
    }

    public async parse(): Promise<void> {
        const files = await readdir(this._inFolder, 'utf-8');
        await rmdir(this._outFolder, { recursive: true }).catch(() => { });
        await mkdir(path.resolve(this._outFolder), { recursive: true });
        const fileNames: string[] = [];

        await Promise.all(files.map(async (file) => {
            const content = await readFile(`${this._inFolder}/${file}`, 'utf-8');
            const model = this._parseNative(content);
            const fileName = kebabCase(model.name) + '.ts';
            await writeFile(`${this._outFolder}/${fileName}`, model.compile(), 'utf-8');
            fileNames.push(fileName);
            TypeResolver.addNative(model);
        }));

        const index = fileNames.map(x => `export * from './${x.replace('.ts', '')}';`).join('\n');
        await writeFile(`${this._outFolder}/index.ts`, index, 'utf-8');
    }

    private _parseNative(content: string): Native {
        const [header] = content.split('\n');

        const [namespace, name] = header.split('::').map(x => MdParser.removeTextStyle(x).trim());
        const paramsRaw = MdParser.parseSection('Parameters', content).split('\n').filter(Boolean);
        const params: TFuncParam[] = paramsRaw
            .map(x => {
                let cleaned = MdParser.removeTextStyle(x);
                if (cleaned.startsWith('* ')) {
                    cleaned = cleaned.substring(2);
                } else {
                    return;
                }

                const parsed = MdParser.parseField(cleaned);

                let type = TypeResolver.getType(parsed.type);

                if (!type) {
                    throw new Error(`Failed to resolve type ${parsed.type} in ${name}`);
                }

                return { type, field: parsed };
            }).filter((x) => x !== undefined) as TFuncParam[];

        const { Hash } = MdParser.parseList<{ Version: string, Hash: string }>(MdParser.parseSection('Hashes', content))[0];

        let returnType = MdParser.removeTextStyle(MdParser.parseSection('Returns', content).trim().split('\n').filter(Boolean)[0]?.split(':')[0] ?? 'void');

        if (returnType.startsWith('* ')) {
            returnType = returnType.substring(2);
        }

        returnType = returnType.replace(/:/g, '').trim();

        const type = TypeResolver.getType(returnType);

        if (!type) {
            throw new Error(`Failed to resolve type ${returnType} in ${name}`);
        }

        const notes = MdParser.parseSection('Notes', content);

        const model = new Native(NATIVES_PROJECT_NAME, this._outFolder, namespace, name, camelCase(name), Hash, params, { ...type, isArray: false, name: '' }, notes.split('\n').filter(Boolean).filter(x => !x.startsWith('<!--')));

        return model;
    }
}