import { createRuntime } from '../src/runner'
import { runRuntimeContract } from './contract'

runRuntimeContract('createRuntime with a scripted mock adapter', createRuntime)
