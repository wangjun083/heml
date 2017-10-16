import { filter, difference, keyBy } from 'lodash'
import renderElement from './renderElement'

export { renderElement }

/**
 * preRender, render, and postRender all elements
 * @param  {Array}   elements  List of element definitons
 * @param  {Object}  globals
 * @return {Promise}           Returns an object with the cheerio object and metadata
 */
export default async function render ($, options = {}) {
  const {
    elements = []
  } = options

  const metadata = {}
  const globals = { $, metadata }

  await preRenderElements(elements, globals)
  await renderElements(elements, globals)
  await postRenderElements(elements, globals)

  return { $, metadata }
}

/**
 * Run the async preRender functions for each element
 * @param  {Array}  elements  List of element definitons
 * @param  {Object} globals
 * @return {Promise}
 */
async function preRenderElements (elements, globals) {
  for (let element of elements) {
    await element.preRender(globals)
  }
}

/**
 * Run the async postRender functions for each element
 * @param  {Array}  elements  List of element definitons
 * @param  {Object} globals
 * @return {Promise}
 */
async function postRenderElements (elements, globals) {
  for (let element of elements) {
    await element.postRender(globals)
  }
}

/**
 * Renders all HEML elements
 * @param  {Array}  elements  List of element definitons
 * @param  {Object} globals
 * @return {Promise}
 */
async function renderElements (elements, globals) {
  const { $ } = globals
  const elementMap = keyBy(elements, 'tagName')
  const metaTagNames = filter(elements, { parent: [ 'head' ] }).map(({ tagName }) => tagName)
  const nonMetaTagNames = difference(elements.map(({ tagName }) => tagName), metaTagNames)

  const $nodes = [
    ...$.findNodes(metaTagNames), /** Render the meta elements first */
    ...$.findNodes(nonMetaTagNames).reverse() /** Render the elements last to first */
  ]

  for (let $node of $nodes) {
    const element = elementMap[$node[0].tagName]
    const contents = $node.html()
    const attrs = $node[0].attribs

    const renderedValue = await Promise.resolve(renderElement(element, attrs, contents))

    $node.replaceWith(renderedValue.trim())
  }
}
