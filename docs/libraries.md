# [Libraries used in the plugin](#libraries-used-in-the-plugin)

## PyQGIS

It is a Python interface to the QGIS API, which allows you to access QGIS 
functionality from Python.
It is used in QSMPG mainly to read/write vector layers from/to a project.

## PyQt5

Qt is a framework that provides a comprehensive set of tools and libraries for 
building applications.
Its main use in QSMPG is to provide a user interface with widgets, layouts, and 
other essential components such as threads and timers.

## NumPy

Numpy is a library that provides a multidimensional array object, various 
derived objects (such as masked arrays and matrices), and an assortment of 
routines for fast operations.
It is a dependency for most relevant libraries used in QSMPG and for the 
core functionality of QSMPG itself.

## SciPy

SciPy is a collection of mathematical algorithms and convenience functions 
built on NumPy. 
It is used in QSMPG to provide functions to calculate some statistics and 
probabilities derived from the input data.

## Pandas

Pandas is a library that provides high-performance, easy-to-use data structures 
and data analysis tools for the Python programming language.
It is used in QSMPG for storing and manipulating input data as well as derived 
statistics from it.

## pyTopoJSON

pyTopoJSON provides tools for converting GeoJSON to TopoJSON.
It is used in QSMPG to convert GeoJSON data into TopoJSON format, which is a 
more compact and efficient representation of geographic data and can be read 
through a web browser with the proper Javascript libraries.

## json

It is a Python built-in library.
It is used to convert python dictionaries that represent settings into JSON 
files or strings.

## zlib

It is a Python built-in library.
Its main use in the plugin is to compress data in order to reduce the size of 
data for the web report.

## base64

It is a Python built-in library.
Its is used mainly to encode binary data in Base64 format, which can be read by 
a web browser without the need of fetching external resources and triggering 
security warnings.

## os

It is a Python built-in library.
It is used mainly to provide operations with files and directories.

## typing

It is a Python built-in library.
It is used for type hinting for the code.
This module is needed since QGIS LTR uses an old version of Python 3, which 
does not support some type hints.