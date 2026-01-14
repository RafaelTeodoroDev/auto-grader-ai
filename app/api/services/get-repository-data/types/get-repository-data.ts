export interface GetRepositoryDataResponse {
    directoryStructure: string;
    filesMap: Record<string, string>;
}

export interface GetRepositoryDataService {
  getRepositoryData(): Promise<GetRepositoryDataResponse | null>;
}