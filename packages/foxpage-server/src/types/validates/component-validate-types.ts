import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

import { ResponseBase } from './index-validate-types';

export class AppComponentsReq {
  @JSONSchema({ description: 'Application ID' })
  @IsString()
  @Length(20, 20)
  applicationId: string;

  @JSONSchema({ description: 'Component type, component|editor|library' })
  @IsArray()
  @IsOptional()
  type: Array<string>;

  @JSONSchema({ description: 'Component ID list' })
  @IsArray()
  @IsOptional()
  componentIds: Array<string>;
}

export class ResourceEntry {
  @JSONSchema({ description: 'node' })
  @IsString()
  node: string;

  @JSONSchema({ description: 'browser' })
  @IsString()
  @IsOptional()
  browser: string;

  @JSONSchema({ description: 'css' })
  @IsString()
  @IsOptional()
  css: string;

  @JSONSchema({ description: 'debug' })
  @IsString()
  @IsOptional()
  debug: string;
}

export class ComponentResource {
  @JSONSchema({ description: 'entry' })
  @ValidateNested()
  @IsObject()
  @Type(() => ResourceEntry)
  entry: ResourceEntry;

  @JSONSchema({ description: 'editor-entry' })
  @ValidateNested()
  @IsObject()
  @Type(() => ResourceEntry)
  @IsOptional()
  'editor-entry': ResourceEntry;
}
export class ComponentDetail {
  @JSONSchema({ description: 'Component ID' })
  @IsString()
  id: string;

  @JSONSchema({ description: 'Component name' })
  @IsString()
  name: string;

  @JSONSchema({ description: 'Component version' })
  @IsString()
  version: string;

  @JSONSchema({ description: 'Type' })
  @IsString()
  @IsOptional()
  type: string;

  @JSONSchema({ description: 'Component details' })
  @IsObject()
  @ValidateNested()
  resource: ComponentResource;

  @JSONSchema({ description: 'Component Schema' })
  @IsString()
  schema: string;
}

export class AppComponentsRes extends ResponseBase {
  @ValidateNested({ each: true })
  data: Array<ComponentDetail>;
}

export class AppComponentListReq {
  @JSONSchema({ description: 'Application ID' })
  @IsString()
  @Length(20, 20)
  applicationId: string;

  @JSONSchema({
    description:
      'Component type, component|editor|library, multiple types can be passed, separated by commas',
  })
  @IsString()
  type: string;

  @JSONSchema({ description: 'Search characters, component name and ID' })
  @IsString()
  @IsOptional()
  search: string;

  @JSONSchema({ description: 'Current page number' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page: number;

  @JSONSchema({ description: 'Number of data per page' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  size: number;
}

export class AppComponentVersionListReq {
  @JSONSchema({ description: 'Application ID' })
  @IsString()
  @Length(20, 20)
  applicationId: string;

  @JSONSchema({ description: 'Component file ID' })
  @IsString()
  @Length(20, 20)
  id: string;

  @JSONSchema({ description: 'Search characters, component name and ID' })
  @IsString()
  @IsOptional()
  search: string;

  @JSONSchema({ description: 'Current page number' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page: number;

  @JSONSchema({ description: 'Number of data per page' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  size: number;
}

export class AddComponentReq {
  @JSONSchema({ description: 'Application' })
  @IsString()
  applicationId: string;

  @JSONSchema({ description: 'Component name' })
  @IsString()
  name: string;

  @JSONSchema({ description: 'Component type, component|editor|library' })
  @IsString()
  type: string;
}

export class ComponentFileContentReq {
  @JSONSchema({ description: 'Application' })
  @IsString()
  @Length(20, 20)
  applicationId: string;

  @JSONSchema({ description: 'Component file ID' })
  @IsString()
  @Length(20, 20)
  id: string;
}

export class ComponentFileVersionReq {
  @JSONSchema({ description: 'Application' })
  @IsString()
  @Length(20, 20)
  applicationId: string;

  @JSONSchema({ description: 'Component file ID', default: 'Component file ID' })
  @IsString()
  @Length(20, 20)
  id: string;

  @JSONSchema({ description: 'Component version ID' })
  @IsNumber()
  versionNumber: number;
}

export class ComponentVersionEditReq {
  @JSONSchema({ description: 'Application' })
  @IsString()
  @Length(20, 20)
  applicationId: string;

  @JSONSchema({ description: 'Component version ID', default: 'Component version ID' })
  @IsString()
  @Length(20, 20)
  id: string;
}

export class ComponentVersionUpdateReq {
  @JSONSchema({ description: 'Application ID' })
  @IsString()
  @Length(20, 20)
  applicationId: string;

  @JSONSchema({ description: 'Page content version ID' })
  @IsString()
  @Length(20, 20)
  id: string;

  @JSONSchema({ description: 'Page version content' })
  @IsObject()
  @ValidateNested()
  content: any;

  @JSONSchema({ description: 'Page version number' })
  @IsString()
  @IsOptional()
  version: string;
}

export class UpdateComponentReq {
  @JSONSchema({ description: 'Application' })
  @IsString()
  applicationId: string;

  @JSONSchema({ description: 'Component file ID' })
  @IsString()
  id: string;

  @JSONSchema({ description: 'Component Introduction' })
  @IsString()
  intro: string;
}

export class UpdateComponentContentReq {
  @JSONSchema({ description: 'Application' })
  @IsString()
  applicationId: string;

  @JSONSchema({ description: 'Component content ID' })
  @IsString()
  id: string;

  @JSONSchema({ description: 'Component tags' })
  @IsArray()
  tags: Array<object>;
}

export class AppPackageNameVersion {
  @JSONSchema({ description: 'Component name' })
  @IsString()
  name: string;

  @JSONSchema({ description: 'Component version' })
  @IsString()
  @IsOptional()
  version: string;
}

export class AppNameVersionPackagesReq {
  @JSONSchema({ description: 'Application ID' })
  @IsString()
  @Length(20, 20)
  applicationId: string;

  @JSONSchema({ description: 'Component ID list' })
  @ValidateNested({ always: true, each: true })
  @IsArray()
  nameVersions: Array<AppPackageNameVersion>;

  @JSONSchema({ description: 'Component type, component|editor|library' })
  @IsArray()
  @IsOptional()
  type: Array<string>;
}
