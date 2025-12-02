let tailwindPresent = true
let autoprefixerPresent = true
try { require.resolve('tailwindcss') } catch (e) { tailwindPresent = false }
try { require.resolve('autoprefixer') } catch (e) { autoprefixerPresent = false }

const plugins = {}
if (tailwindPresent) plugins.tailwindcss = {}
if (autoprefixerPresent) plugins.autoprefixer = {}

module.exports = { plugins }
