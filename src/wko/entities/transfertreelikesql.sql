-- 
INSERT into wko_category(wkoId, NAME, mpath, parentCategoryWkoId)
with sourceA AS 
(SELECT DISTINCT * FROM (
SELECT c1.wkoid, c1.name, 
null AS id2, null AS NAME2, 
null AS id3, null AS NAME3,
concat(c1.wkoId, ".") AS patha
FROM (SELECT * FROM wko_category_copy WHERE parentCategoryWkoId IS NULL ) c1
UNION ALL
SELECT 
c1.wkoid, c1.name, 
c2.wkoid AS id2, c2.name AS NAME2, 
null AS id3, null AS NAME3,
concat(c1.wkoId, ".", case when c2.wkoId IS NULL then "" ELSE concat(c2.wkoId, ".") END) AS patha
FROM (SELECT * FROM wko_category_copy WHERE parentCategoryWkoId IS NULL ) c1
LEFT JOIN 
(SELECT * FROM wko_category_copy) c2 ON c1.wkoId = c2.parentCategoryWkoId
UNION all
SELECT 
c1.wkoid, c1.name, 
c2.wkoid AS id2, c2.name AS NAME2, 
c3.wkoid AS id3, c3.name AS NAME3,
concat(c1.wkoId, ".", case when c2.wkoId IS NULL then "" ELSE concat(c2.wkoId, ".") END, case when c3.wkoId IS NULL then "" ELSE concat(c3.wkoId, ".") END) AS patha
FROM (SELECT * FROM wko_category_copy WHERE parentCategoryWkoId IS NULL ) c1
LEFT JOIN 
(SELECT * FROM wko_category_copy) c2 ON c1.wkoId = c2.parentCategoryWkoId
LEFT JOIN 
(SELECT * FROM wko_category_copy) c3 ON c2.wkoId = c3.parentCategoryWkoId
) a) 
SELECT 
 case when name3 is not null then id3 when NAME2 IS not null then id2 else wkoid end as wkoId 
 , case when name3 is not null then name3 when NAME2 IS not null then name2 else name end as name 
 , patha AS mpath
 , case when name3 is not null then id2 when NAME2 IS not null then wkoId else null end as parentCategoryWkoId
 FROM sourceA