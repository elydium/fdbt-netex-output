import { Operator, PeriodTicket } from '../types';
import {
    getScheduledStopPointsList,
    getTopographicProjectionRefList,
    getLinesList,
    getGeoZoneFareTable,
    getMultiServiceFareTable,
    getPreassignedFareProducts,
    getSalesOfferPackageList,
    getTimeIntervals,
    getFareStructuresElements,
    isMultiServiceTicket,
    isGeoZoneTicket,
} from './periodTicketNetexHelpers';
import { NetexObject, getCleanWebsite, getNetexTemplateAsJson, convertJsonToXml } from '../sharedHelpers';

const placeHolderGroupOfProductsName = 'PLACEHOLDER';

const periodTicketNetexGenerator = (userPeriodTicket: PeriodTicket, operatorData: Operator): { generate: Function } => {
    const opIdNocFormat = `noc:${operatorData.opId}`;
    const nocCodeNocFormat = `noc:${userPeriodTicket.nocCode}`;
    const currentDate = new Date(Date.now());
    const website = getCleanWebsite(operatorData.website);

    const updatePublicationTimeStamp = (publicationTimeStamp: NetexObject): NetexObject => {
        const publicationTimeStampToUpdate = { ...publicationTimeStamp };
        publicationTimeStampToUpdate.PublicationTimestamp.$t = currentDate;

        return publicationTimeStampToUpdate;
    };

    const updatePublicationRequest = (publicationRequest: NetexObject): NetexObject => {
        const publicationRequestToUpdate = { ...publicationRequest };
        publicationRequestToUpdate.RequestTimestamp.$t = currentDate;
        publicationRequestToUpdate.Description.$t = `Request for ${userPeriodTicket.nocCode} bus pass fares`;
        publicationRequestToUpdate.topics.NetworkFrameTopic.NetworkFilterByValue.objectReferences.OperatorRef.ref = nocCodeNocFormat;
        publicationRequestToUpdate.topics.NetworkFrameTopic.NetworkFilterByValue.objectReferences.OperatorRef.$t = opIdNocFormat;
        // below ref is being set to the first product name, so the ID can be found.
        publicationRequestToUpdate.topics.NetworkFrameTopic.NetworkFilterByValue.objectReferences.PreassignedFareProductRef.ref = `op:Pass@${userPeriodTicket.products[0].productName}_${userPeriodTicket.passengerType}`;

        return publicationRequestToUpdate;
    };

    const updateCompositeFrame = (compositeFrame: NetexObject): NetexObject => {
        const compositeFrameToUpdate = { ...compositeFrame };
        compositeFrameToUpdate.id = `epd:UK:${userPeriodTicket.nocCode}:CompositeFrame_UK_PI_NETWORK_FARE_OFFER:Pass@${placeHolderGroupOfProductsName}:op`;
        compositeFrameToUpdate.Name.$t = `Fares for ${userPeriodTicket.operatorName}`;
        compositeFrameToUpdate.Description.$t = `Period ticket for ${userPeriodTicket.operatorName}`;

        return compositeFrameToUpdate;
    };

    const updateResourceFrame = (resourceFrame: NetexObject): NetexObject => {
        const resourceFrameToUpdate = { ...resourceFrame };

        resourceFrameToUpdate.id = `epd:UK:${userPeriodTicket.nocCode}:ResourceFrame_UK_PI_COMMON:${userPeriodTicket.nocCode}:op`;
        resourceFrameToUpdate.codespaces.Codespace.XmlnsUrl.$t = website;
        resourceFrameToUpdate.dataSources.DataSource.Email.$t = operatorData.ttrteEnq;
        resourceFrameToUpdate.responsibilitySets.ResponsibilitySet[0].roles.ResponsibilityRoleAssignment.ResponsibleOrganisationRef.ref = nocCodeNocFormat;
        resourceFrameToUpdate.responsibilitySets.ResponsibilitySet[0].roles.ResponsibilityRoleAssignment.ResponsibleOrganisationRef.$t =
            operatorData.operatorPublicName;
        resourceFrameToUpdate.responsibilitySets.ResponsibilitySet[1].roles.ResponsibilityRoleAssignment.ResponsibleOrganisationRef.ref = nocCodeNocFormat;
        resourceFrameToUpdate.responsibilitySets.ResponsibilitySet[1].roles.ResponsibilityRoleAssignment.ResponsibleOrganisationRef.$t =
            operatorData.operatorPublicName;
        resourceFrameToUpdate.typesOfValue.ValueSet[0].values.Branding.id = `op:${userPeriodTicket.operatorName}@brand`;
        resourceFrameToUpdate.typesOfValue.ValueSet[0].values.Branding.Name.$t = operatorData.operatorPublicName;
        resourceFrameToUpdate.typesOfValue.ValueSet[0].values.Branding.Url.$t = website;
        resourceFrameToUpdate.organisations.Operator.id = nocCodeNocFormat;
        resourceFrameToUpdate.organisations.Operator.PublicCode.$t = userPeriodTicket.nocCode;
        resourceFrameToUpdate.organisations.Operator.Name.$t = operatorData.operatorPublicName;
        resourceFrameToUpdate.organisations.Operator.ShortName.$t = userPeriodTicket.operatorName;
        resourceFrameToUpdate.organisations.Operator.TradingName.$t = operatorData.vosaPsvLicenseName;
        resourceFrameToUpdate.organisations.Operator.ContactDetails.Phone.$t = operatorData.fareEnq;
        resourceFrameToUpdate.organisations.Operator.ContactDetails.Url.$t = website;
        resourceFrameToUpdate.organisations.Operator.Address.Street.$t = operatorData.complEnq;
        resourceFrameToUpdate.organisations.Operator.PrimaryMode.$t = operatorData.mode.toLowerCase();

        return resourceFrameToUpdate;
    };

    const updateSiteFrame = (siteFrame: NetexObject): NetexObject => {
        const siteFrameToUpdate = { ...siteFrame };

        siteFrameToUpdate.id = `epd:UK:${userPeriodTicket.nocCode}:SiteFrame_UK_PI_STOP:sale_pois:op`;
        siteFrameToUpdate.Name.$t = `Common site elements for ${userPeriodTicket.nocCode}: Travel Shops`;

        return siteFrameToUpdate;
    };

    const updateServiceCalendarFrame = (serviceCalendarFrame: NetexObject): NetexObject => {
        const serviceCalendarFrameToUpdate = { ...serviceCalendarFrame };

        serviceCalendarFrameToUpdate.id = `epd:UK:${userPeriodTicket.nocCode}:ServiceCalendarFrame_UK_PI_CALENDAR:sale_pois:op`;

        return serviceCalendarFrameToUpdate;
    };

    const updateServiceFrame = (serviceFrame: NetexObject): NetexObject | null => {
        if (isMultiServiceTicket(userPeriodTicket)) {
            const serviceFrameToUpdate = { ...serviceFrame };
            serviceFrameToUpdate.id = `epd:UK:${userPeriodTicket.nocCode}:ServiceFrame_UK_PI_NETWORK:Line_${placeHolderGroupOfProductsName}:op`;

            serviceFrameToUpdate.lines.Line = getLinesList(userPeriodTicket, operatorData);

            return serviceFrameToUpdate;
        }

        return null;
    };

    const updateNetworkFareFrame = (networkFareFrame: NetexObject): NetexObject | null => {
        if (isGeoZoneTicket(userPeriodTicket)) {
            const networkFareFrameToUpdate = { ...networkFareFrame };

            networkFareFrameToUpdate.id = `epd:UK:${userPeriodTicket.nocCode}:FareFrame_UK_PI_FARE_NETWORK:${placeHolderGroupOfProductsName}@pass:op`;
            networkFareFrameToUpdate.Name.$t = `${placeHolderGroupOfProductsName} Network`;
            networkFareFrameToUpdate.prerequisites.ResourceFrameRef.ref = `epd:UK:${userPeriodTicket.nocCode}:ResourceFrame_UK_PI_COMMON:${userPeriodTicket.nocCode}:op`;

            networkFareFrameToUpdate.fareZones.FareZone.id = `op:${placeHolderGroupOfProductsName}@${userPeriodTicket.zoneName}`;
            networkFareFrameToUpdate.fareZones.FareZone.Name.$t = `${userPeriodTicket.zoneName}`;
            networkFareFrameToUpdate.fareZones.FareZone.Description.$t = `${userPeriodTicket.zoneName} ${placeHolderGroupOfProductsName} Zone`;
            networkFareFrameToUpdate.fareZones.FareZone.members.ScheduledStopPointRef = getScheduledStopPointsList(
                userPeriodTicket.stops,
            );
            networkFareFrameToUpdate.fareZones.FareZone.projections.TopographicProjectionRef = getTopographicProjectionRefList(
                userPeriodTicket.stops,
            );

            return networkFareFrameToUpdate;
        }

        return null;
    };

    const updatePriceFareFrame = (priceFareFrame: NetexObject): NetexObject => {
        const priceFareFrameToUpdate = { ...priceFareFrame };

        priceFareFrameToUpdate.id = `epd:UK:${userPeriodTicket.nocCode}:FareFrame_UK_PI_FARE_PRODUCT:${placeHolderGroupOfProductsName}@pass:op`;

        if (isGeoZoneTicket(userPeriodTicket)) {
            priceFareFrameToUpdate.prerequisites.FareFrameRef.ref = `epd:UK:${userPeriodTicket.nocCode}:FareFrame_UK_PI_FARE_NETWORK:${placeHolderGroupOfProductsName}@pass:op`;
        } else if (isMultiServiceTicket(userPeriodTicket)) {
            priceFareFrameToUpdate.prerequisites = null;
        }
        priceFareFrameToUpdate.tariffs.Tariff.id = `op:Tariff@${placeHolderGroupOfProductsName}`;
        priceFareFrameToUpdate.tariffs.Tariff.validityConditions = {
            ValidBetween: {
                FromDate: { $t: currentDate.toISOString() },
                ToDate: { $t: new Date(currentDate.setFullYear(currentDate.getFullYear() + 99)).toISOString() },
            },
        };
        priceFareFrameToUpdate.tariffs.Tariff.Name.$t = `${placeHolderGroupOfProductsName} - Tariff`;
        priceFareFrameToUpdate.tariffs.Tariff.Description.$t = `${placeHolderGroupOfProductsName} single zone tariff`;
        priceFareFrameToUpdate.tariffs.Tariff.OperatorRef.ref = nocCodeNocFormat;
        priceFareFrameToUpdate.tariffs.Tariff.OperatorRef.$t = opIdNocFormat;
        priceFareFrameToUpdate.tariffs.Tariff.geographicalIntervals.GeographicalInterval.id = `op:Tariff@${placeHolderGroupOfProductsName}@1zone`;

        // Time intervals
        if (
            isGeoZoneTicket(userPeriodTicket) ||
            (isMultiServiceTicket(userPeriodTicket) && userPeriodTicket.products[0].productDuration)
        ) {
            priceFareFrameToUpdate.tariffs.Tariff.timeIntervals.TimeInterval = getTimeIntervals(userPeriodTicket);
        } else {
            priceFareFrameToUpdate.tariffs.Tariff.timeIntervals = null;
        }

        // Fare structure elements
        priceFareFrameToUpdate.tariffs.Tariff.fareStructureElements.FareStructureElement = getFareStructuresElements(
            userPeriodTicket,
            placeHolderGroupOfProductsName,
        );

        // Preassigned Fare Product
        priceFareFrameToUpdate.fareProducts.PreassignedFareProduct = getPreassignedFareProducts(
            userPeriodTicket,
            nocCodeNocFormat,
            opIdNocFormat,
        );

        // Sales Offer Package
        priceFareFrameToUpdate.salesOfferPackages.SalesOfferPackage = getSalesOfferPackageList(userPeriodTicket);

        return priceFareFrameToUpdate;
    };

    const updateFareTableFareFrame = (fareTableFareFrame: NetexObject): NetexObject => {
        const fareTableFareFrameToUpdate = { ...fareTableFareFrame };

        fareTableFareFrameToUpdate.id = `epd:UK:${userPeriodTicket.nocCode}:FareFrame_UK_PI_FARE_PRICE:${placeHolderGroupOfProductsName}@pass:op`;
        fareTableFareFrameToUpdate.Name.$t = `${placeHolderGroupOfProductsName} Prices`;
        fareTableFareFrameToUpdate.prerequisites.FareFrameRef.ref = `epd:UK:${userPeriodTicket.nocCode}:FareFrame_UK_PI_FARE_PRODUCT:${placeHolderGroupOfProductsName}@pass:op`;
        fareTableFareFrameToUpdate.PricingParameterSet.id = `op:Pass@${placeHolderGroupOfProductsName}`;

        if (isGeoZoneTicket(userPeriodTicket)) {
            fareTableFareFrameToUpdate.fareTables.FareTable = getGeoZoneFareTable(
                userPeriodTicket,
                placeHolderGroupOfProductsName,
            );
        } else if (isMultiServiceTicket(userPeriodTicket)) {
            fareTableFareFrameToUpdate.fareTables.FareTable = getMultiServiceFareTable(userPeriodTicket);
        }
        return fareTableFareFrameToUpdate;
    };

    const generate = async (): Promise<string> => {
        const netexJson = await getNetexTemplateAsJson('period-tickets/periodTicketNetexTemplate.xml');

        netexJson.PublicationDelivery = updatePublicationTimeStamp(netexJson.PublicationDelivery);
        netexJson.PublicationDelivery.PublicationRequest = updatePublicationRequest(
            netexJson.PublicationDelivery.PublicationRequest,
        );
        netexJson.PublicationDelivery.dataObjects.CompositeFrame[0] = updateCompositeFrame(
            netexJson.PublicationDelivery.dataObjects.CompositeFrame[0],
        );

        const netexFrames = netexJson.PublicationDelivery.dataObjects.CompositeFrame[0].frames;
        netexFrames.SiteFrame = updateSiteFrame(netexFrames.SiteFrame);
        netexFrames.ResourceFrame = updateResourceFrame(netexFrames.ResourceFrame);
        netexFrames.ServiceCalendarFrame = updateServiceCalendarFrame(netexFrames.ServiceCalendarFrame);

        netexFrames.ServiceFrame = updateServiceFrame(netexFrames.ServiceFrame);

        // Multi Service does not need a Network Frame
        if (isGeoZoneTicket(userPeriodTicket)) {
            netexFrames.FareFrame = [
                updateNetworkFareFrame(netexFrames.FareFrame[0]),
                updatePriceFareFrame(netexFrames.FareFrame[1]),
                updateFareTableFareFrame(netexFrames.FareFrame[2]),
            ];
        } else if (isMultiServiceTicket(userPeriodTicket)) {
            netexFrames.FareFrame = [
                updatePriceFareFrame(netexFrames.FareFrame[1]),
                updateFareTableFareFrame(netexFrames.FareFrame[2]),
            ];
        }

        return convertJsonToXml(netexJson);
    };

    return { generate };
};

export default periodTicketNetexGenerator;