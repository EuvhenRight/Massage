/**
 * Image cards for the depilation landing “Services” block — order matches studio menu.
 * Photos: `/public/images/depilation/*.png`.
 */
export const DEPILATION_SERVICE_SECTION_IDS = [
	'laser',
	'wax',
	'sugar',
	'electro',
	'piercing',
	'cosmetology',
	'courses',
	'additional',
] as const

export type DepilationServiceSectionId =
	(typeof DEPILATION_SERVICE_SECTION_IDS)[number]

const IMG = (file: string) => `/images/depilation/${file}`

export const DEPILATION_SERVICE_SECTION_IMAGES: Record<
	DepilationServiceSectionId,
	string
> = {
	laser: IMG(
		'0E99BE5B-A88A-47AB-B264-3FC267ACCCD4_1_105_c-04788ef6-5115-4c2c-8a4c-74129c6e50f5.png',
	),
	wax: IMG(
		'1C31A34F-8403-484E-993A-78298DF9925E_1_105_c-dd0c3819-6aa5-4dc0-83d8-4902f1e737e2.png',
	),
	sugar: IMG(
		'47BE5BD1-5727-4F92-91C5-7E4ADA470BE7_1_105_c-4e5d650d-1a5e-4f46-919a-a2e3c4dcd904.png',
	),
	electro: IMG(
		'7E17C6FA-202D-4C8B-AE13-C6B908A159C4_1_105_c-74b4a433-f2de-477c-a6b3-42c6f9058950.png',
	),
	piercing: IMG(
		'AB678F7C-B5F1-468E-B739-4B8720842F20_1_105_c-d333239b-5b90-40a1-b3f3-bdb92ec4ba15.png',
	),
	cosmetology: IMG(
		'AC2A6C46-C748-4442-A844-8308EF549B01_1_105_c-c4a1a659-e4f8-450c-bbf8-ce2e348acbbf.png',
	),
	courses: IMG(
		'E9A1D7C4-02D4-4718-9455-AB23672CC127_1_105_c-8ea037d5-0afb-4946-85b7-548eb136ccca.png',
	),
	additional: IMG(
		'FD5A90EF-7384-410B-B069-880FF57AD64E_1_105_c-e553e146-de2e-455a-8edc-21ec8e423efb.png',
	),
}
