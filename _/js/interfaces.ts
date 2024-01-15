///<reference path="jquery.d.ts" />

declare function $(selector: any): JQuery

declare interface MnemoSettings {
	id: string
	insqlSource: string
	insqlTimeout: number
	blinkTimeout: number
	blinkCount: number
	defaultFixed: number
	allowBlink: boolean
	allowEdit: boolean
	enableEdit: boolean
	static: boolean
}

declare interface MnemoTagList {
	[key: string]: string | number
}

declare interface MnemoJson {
	Items: {
		[key: string]: {
			Type: string
		}
	}
	NextId: number
}

declare interface MnemoInsqlTag {
	TagList: string[]
	Eval: string
	DefaultClass: string
	RangeValues: (string | number)[]
	RangeClasses: string[]
	TextValue: string | null
	Type: "INSQL_value"
	Coords: {
		Top: number
		Left: number
	}
}

declare interface ImageSettings {
	id: number
	TagList: string[]
	Eval: string
	Range: RangeValues
	DefaultClass: string
	Src: string[]
	Type: "Image"
	Style: {
		Top: string
		Left: string
		Height: string
		Width: string
		Index: number
	}
}

declare type RangeValues = (string | number)[]

declare function ajax(url: string, form: { [key: string]: string }, callback: (data: string) => void): void

declare interface ImageElementObject {
	id: number
	el: HTMLImageElement
	x: number
	y: number
	dataId: number
	imageType: string
	imageTag: string
	evl: string
	defState: string
	name: string
	first: boolean
	states: { [key: string]: { text: string, image: string } }
}