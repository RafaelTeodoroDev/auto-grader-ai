import githubService from "./implementations/github-service";
import zipRepositoryService from "./implementations/zip-repository-service";
import codebaseService from "./implementations/codebase-service";

const implementations = {
  github: githubService,
  zipRepository: zipRepositoryService,
  codebase: codebaseService,
};

export default new implementations['zipRepository']();