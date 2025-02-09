import { BUNCH_OF_DASHES, BUNCH_OF_EQUALS } from './constants'
import { CoverageLine } from './types'
import stripAnsi from 'strip-ansi'
import * as core from '@actions/core'

function parseLine(line: string): string[] {
  return line.split('|').map((l) => l.replace('%', '').replace('#s', '').trim())
}

function arrToLine(arr: string[]): CoverageLine {
  return {
    file: arr[0],
    stmts: Number(arr[1]),
    branch: Number(arr[2]),
    funcs: Number(arr[3]),
    lines: Number(arr[4]),
    uncoveredLines: arr[5]?.length ? arr[5]?.split(',') : null,
  } as CoverageLine
}

function isHeaderLine(arr: string[]): boolean {
  return ['File', 'Stmts', 'Lines'].every((s) => arr.includes(s))
}

function isTotalLine(arr: string[]): boolean {
  return arr[0] === 'All files'
}

function isFileLine(arr: string[]): boolean {
  return arr[0].includes('.')
}

function isFolderLine(arr: string[]): boolean {
  return !isFileLine(arr) && !isHeaderLine(arr)
}

export function getTotalLine(
  coverageArr: CoverageLine[]
): CoverageLine | undefined {
  return coverageArr.find((c) => c.file === 'All files')
}

export function isFile(line: CoverageLine): boolean {
  return line?.file.includes('.')
}

export function isFolder(line: CoverageLine): boolean {
  return !isFile(line)
}

export function parseCoverage(content: string): CoverageLine[] {
  const arr = stripAnsi(content).split('\n')
  const result: CoverageLine[] = []
  const folders = []
  const startFrom = arr.findIndex((l) => l.includes(BUNCH_OF_DASHES))

  for (const line of arr.slice(startFrom)) {
    if (
      line.includes('Jest: ') ||
      line.includes('coverage threshold for ') ||
      line.includes('Test Suites: ') ||
      line.includes('Snapshots: ') ||
      line.includes('Time: ') ||
      line.startsWith('info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.') ||
      line.startsWith('error Command failed with exit code 1.')
    ) {
      break
    }

    if (
      line.includes(BUNCH_OF_EQUALS) ||
      line.includes(BUNCH_OF_DASHES) ||
      !line?.trim()?.length ||
      line.includes('turbo run test') ||
      line.includes('Packages in scope') ||
      line.includes('Running test') ||
      line.includes('Remote caching ') ||
      line.includes('iron:test') ||
      line.includes('cache miss') ||
      line.includes('cache hit') ||
      line.includes('yarn run') ||
      line.includes('$ ci=true jest') ||
      line.includes('Browserslist: caniuse-lite is outdated. Please run:') ||
      line.includes('npx update-browserslist-db@latest') ||
      line.includes('Why you should do it') ||
      line.startsWith('PASS Client') ||
      line.startsWith('PASS Server') ||
      line.startsWith('FAIL Client') ||
      line.startsWith('FAIL Server') ||
      line.includes('Coverage summary') ||
      line.includes('Statements') ||
      line.includes('Branches') ||
      line.includes('Functions') ||
      line.includes('Lines') ||
      line.startsWith('Done in ')
    ) {
      continue
    }

    const parsedLine = parseLine(line)
    const isCurrentFolder = isFolderLine(parsedLine)
    const isCurrentFile = isFileLine(parsedLine)
    const [fileName] = parsedLine

    if (isCurrentFolder && !isTotalLine(parsedLine)) {
      if (folders?.length) {
        folders.pop()
      }

      folders.push(fileName)
    }

    if (!isCurrentFolder && folders?.length) {
      parsedLine[0] = `${folders.at(-1)}/${parsedLine.at(0)}`.replace('//', '/')
    }

    if (isCurrentFolder || isCurrentFile) {
      result.push(arrToLine(parsedLine))
    }
  }
  
  return result
}

export const exportedForTesting = {
  parseLine,
  isHeaderLine,
  isTotalLine,
  isFileLine,
  isFolderLine,
  arrToLine,
}
